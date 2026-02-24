import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";

// --- Configuration ---

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const MAX_ROOM_SIZE = parseInt(process.env.MAX_ROOM_SIZE ?? "10", 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") ?? [];
const COLLAB_SECRET = process.env.COLLAB_SECRET ?? "";
const MAX_CONNECTIONS_PER_IP = 20;
const MAX_TOTAL_CONNECTIONS = 1000;
const MAX_MESSAGES_PER_SECOND = 30;

// --- Startup warnings ---

if (!COLLAB_SECRET) {
  console.warn(
    "[WARN] COLLAB_SECRET is not set. All connections will be rejected.",
  );
}

if (ALLOWED_ORIGINS.length === 0) {
  console.warn(
    "[WARN] ALLOWED_ORIGINS is empty. No cross-origin requests will be allowed.",
  );
}

// --- Types ---

interface Participant {
  username: string;
  color: string;
}

interface Room {
  ownerSocketId: string;
  participants: Map<string, Participant>;
  latestScene: { encryptedData: string; iv: string } | null;
}

// --- Validation helpers ---

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateUsername(value: unknown): value is string {
  return isString(value) && value.length > 0 && value.length <= 50;
}

function validateColor(value: unknown): value is string {
  return isString(value) && /^#[0-9a-fA-F]{6}$/.test(value);
}

function validatePointer(
  value: unknown,
): value is { x: number; y: number; tool?: string } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return isFiniteNumber(obj.x) && isFiniteNumber(obj.y);
}

function validateEncryptedPayload(
  value: unknown,
): value is { encryptedData: string; iv: string } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    isString(obj.encryptedData) &&
    obj.encryptedData.length <= 5 * 1024 * 1024 && // 5 MB max
    isString(obj.iv) &&
    obj.iv.length <= 100
  );
}

// --- Auth helpers ---

function verifyToken(token: string): { userId: string } | null {
  if (!COLLAB_SECRET) return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const base64urlPayload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  // Verify HMAC signature
  const expectedSignature = createHmac("sha256", COLLAB_SECRET)
    .update(base64urlPayload)
    .digest("hex");

  // Constant-time comparison to avoid timing attacks
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  if (sigBuf.length !== expectedBuf.length) return null;

  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  // Decode payload
  try {
    const jsonStr = Buffer.from(base64urlPayload, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr) as { userId?: string; exp?: number };

    if (!payload.userId || typeof payload.userId !== "string") return null;
    if (typeof payload.exp !== "number") return null;

    // Check expiration (exp is in seconds)
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) return null;

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

// --- Rate limiting state ---

const connectionsPerIp = new Map<string, number>();
let totalConnections = 0;

interface RateLimitState {
  count: number;
  windowStart: number;
}

const socketRateLimits = new Map<string, RateLimitState>();

function getSocketIp(socket: Socket): string {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return socket.handshake.address;
}

function checkMessageRate(socket: Socket): boolean {
  const now = Date.now();
  let state = socketRateLimits.get(socket.id);

  if (!state || now - state.windowStart >= 1000) {
    // Start a new window
    state = { count: 1, windowStart: now };
    socketRateLimits.set(socket.id, state);
    return true;
  }

  state.count++;
  if (state.count > MAX_MESSAGES_PER_SECOND) {
    socket.emit("error", { message: "Rate limit exceeded" });
    socket.disconnect(true);
    return false;
  }

  return true;
}

// --- State ---

const rooms = new Map<string, Room>();

// --- Server setup ---

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 5 * 1024 * 1024, // 5 MB
});

// --- Helpers ---

function log(event: string, roomId?: string, socketId?: string) {
  const parts = [`[${new Date().toISOString()}] ${event}`];
  if (roomId) parts.push(`room=${roomId}`);
  if (socketId) parts.push(`socket=${socketId}`);
  console.log(parts.join(" "));
}

function isOwner(roomId: string, socketId: string): boolean {
  const room = rooms.get(roomId);
  return room?.ownerSocketId === socketId;
}

function getRoomForSocket(socketId: string): string | undefined {
  for (const [roomId, room] of rooms) {
    if (
      room.ownerSocketId === socketId ||
      room.participants.has(socketId)
    ) {
      return roomId;
    }
  }
  return undefined;
}

function closeRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit("room:closed", { roomId });

  // Disconnect all sockets from the Socket.IO room
  for (const socketId of room.participants.keys()) {
    const socket = io.sockets.sockets.get(socketId);
    socket?.leave(roomId);
  }

  rooms.delete(roomId);
  log("room-closed", roomId);
}

// --- Connection & rate limit middleware (C2 - runs BEFORE auth) ---

io.use((socket, next) => {
  const ip = getSocketIp(socket);

  // Global connection cap
  if (totalConnections >= MAX_TOTAL_CONNECTIONS) {
    return next(new Error("Server at capacity"));
  }

  // Per-IP connection limit
  const currentIpCount = connectionsPerIp.get(ip) ?? 0;
  if (currentIpCount >= MAX_CONNECTIONS_PER_IP) {
    return next(new Error("Too many connections from this IP"));
  }

  // Track connections
  connectionsPerIp.set(ip, currentIpCount + 1);
  totalConnections++;

  // Clean up on disconnect
  socket.on("disconnect", () => {
    const count = connectionsPerIp.get(ip) ?? 1;
    if (count <= 1) {
      connectionsPerIp.delete(ip);
    } else {
      connectionsPerIp.set(ip, count - 1);
    }
    totalConnections--;

    // Clean up rate limit state
    socketRateLimits.delete(socket.id);
  });

  next();
});

// --- Auth middleware (C1 - runs AFTER connection limits) ---

io.use((socket, next) => {
  if (!COLLAB_SECRET) {
    return next(new Error("Authentication failed"));
  }

  const token = socket.handshake.auth?.token;
  if (!token || typeof token !== "string") {
    return next(new Error("Authentication failed"));
  }

  const result = verifyToken(token);
  if (!result) {
    return next(new Error("Authentication failed"));
  }

  socket.data.userId = result.userId;
  next();
});

// --- Socket.IO events ---

io.on("connection", (socket) => {
  log("connected", undefined, socket.id);

  // --- room:create ---
  socket.on("room:create", (_data: unknown, callback: (response: { roomId?: string; error?: string }) => void) => {
    if (!checkMessageRate(socket)) return;

    // Prevent creating multiple rooms
    const existingRoom = getRoomForSocket(socket.id);
    if (existingRoom) {
      if (typeof callback === "function") {
        callback({ error: "Already in a room" });
      }
      return;
    }

    const roomId = nanoid(16);
    const room: Room = {
      ownerSocketId: socket.id,
      participants: new Map([[socket.id, { username: "Owner", color: "#000000" }]]),
      latestScene: null,
    };

    rooms.set(roomId, room);
    socket.join(roomId);

    log("room-created", roomId, socket.id);

    if (typeof callback === "function") {
      callback({ roomId });
    }
  });

  // --- room:join ---
  socket.on(
    "room:join",
    (
      data: unknown,
      callback?: (response: { error?: string; participants?: Record<string, Participant> }) => void,
    ) => {
      if (!checkMessageRate(socket)) return;

      // Validate input
      if (typeof data !== "object" || data === null) {
        if (typeof callback === "function") callback({ error: "Invalid data" });
        return;
      }

      const obj = data as Record<string, unknown>;
      if (!isString(obj.roomId)) {
        if (typeof callback === "function") callback({ error: "Invalid room ID" });
        return;
      }
      if (!validateUsername(obj.username)) {
        if (typeof callback === "function") callback({ error: "Invalid username" });
        return;
      }
      if (!validateColor(obj.color)) {
        if (typeof callback === "function") callback({ error: "Invalid color" });
        return;
      }

      const { roomId, username, color } = obj as { roomId: string; username: string; color: string };
      const room = rooms.get(roomId);

      if (!room) {
        if (typeof callback === "function") {
          callback({ error: "Room not found" });
        }
        return;
      }

      if (room.participants.size >= MAX_ROOM_SIZE) {
        if (typeof callback === "function") {
          callback({ error: "Room is full" });
        }
        return;
      }

      room.participants.set(socket.id, { username, color });
      socket.join(roomId);

      // Notify existing participants
      socket.to(roomId).emit("participant:joined", {
        socketId: socket.id,
        username,
        color,
      });

      // Build participant record for the joiner
      const participants: Record<string, Participant> = {};
      for (const [sid, p] of room.participants) {
        if (sid !== socket.id) {
          participants[sid] = p;
        }
      }

      log("participant-joined", roomId, socket.id);

      if (typeof callback === "function") {
        callback({ participants });
      }

      // Send latest scene to late joiner if available
      if (room.latestScene) {
        socket.emit("scene:full", room.latestScene);
      }
    },
  );

  // --- room:close (owner only) ---
  socket.on("room:close", () => {
    if (!checkMessageRate(socket)) return;

    const roomId = getRoomForSocket(socket.id);
    if (!roomId) return;

    if (!isOwner(roomId, socket.id)) {
      socket.emit("error", { message: "Only the owner can close the room" });
      return;
    }

    closeRoom(roomId);
  });

  // --- scene:full (owner only, stores encrypted scene for late joiners) ---
  socket.on("scene:full", (data: unknown) => {
    if (!checkMessageRate(socket)) return;

    if (!validateEncryptedPayload(data)) return;

    const roomId = getRoomForSocket(socket.id);
    if (!roomId) return;

    if (!isOwner(roomId, socket.id)) {
      socket.emit("error", { message: "Only the owner can send full scene" });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) return;

    room.latestScene = data;
    socket.to(roomId).emit("scene:full", data);
  });

  // --- scene:update (incremental encrypted elements) ---
  socket.on("scene:update", (data: unknown) => {
    if (!checkMessageRate(socket)) return;

    if (!validateEncryptedPayload(data)) return;

    const roomId = getRoomForSocket(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit("scene:update", data);
  });

  // --- cursor:update (unencrypted pointer positions) ---
  socket.on(
    "cursor:update",
    (data: unknown) => {
      if (!checkMessageRate(socket)) return;

      // Validate cursor data
      if (typeof data !== "object" || data === null) return;
      const obj = data as Record<string, unknown>;

      if (!validatePointer(obj.pointer)) return;
      if (!isString(obj.button)) return;
      if (!validateUsername(obj.username)) return;
      if (!validateColor(obj.color)) return;

      const roomId = getRoomForSocket(socket.id);
      if (!roomId) return;

      socket.to(roomId).emit("cursor:update", {
        socketId: socket.id,
        pointer: obj.pointer,
        button: obj.button,
        username: obj.username,
        color: obj.color,
      });
    },
  );

  // --- files:add (encrypted images) ---
  socket.on("files:add", (data: unknown) => {
    if (!checkMessageRate(socket)) return;

    if (!validateEncryptedPayload(data)) return;

    const roomId = getRoomForSocket(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit("files:add", data);
  });

  // --- disconnect ---
  socket.on("disconnect", () => {
    const roomId = getRoomForSocket(socket.id);
    if (!roomId) {
      log("disconnected", undefined, socket.id);
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      log("disconnected", undefined, socket.id);
      return;
    }

    // If the owner disconnects, close the entire room
    if (room.ownerSocketId === socket.id) {
      log("owner-disconnected", roomId, socket.id);
      closeRoom(roomId);
    } else {
      // Remove participant and notify others
      room.participants.delete(socket.id);
      socket.to(roomId).emit("participant:left", { socketId: socket.id });
      log("participant-left", roomId, socket.id);
    }
  });
});

// --- Start ---

httpServer.listen(PORT, () => {
  log(`server-started on port ${PORT}`);
});
