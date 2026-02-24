import { createServer } from "node:http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

// --- Configuration ---

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const MAX_ROOM_SIZE = parseInt(process.env.MAX_ROOM_SIZE ?? "10", 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

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

// --- State ---

const rooms = new Map<string, Room>();

// --- Server setup ---

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB for encrypted scenes/files
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

// --- Socket.IO events ---

io.on("connection", (socket) => {
  log("connected", undefined, socket.id);

  // --- room:create ---
  socket.on("room:create", (_data: unknown, callback: (response: { roomId?: string; error?: string }) => void) => {
    // Prevent creating multiple rooms
    const existingRoom = getRoomForSocket(socket.id);
    if (existingRoom) {
      if (typeof callback === "function") {
        callback({ error: "Already in a room" });
      }
      return;
    }

    const roomId = nanoid(8);
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
      data: { roomId: string; username: string; color: string },
      callback?: (response: { error?: string; participants?: Record<string, Participant> }) => void,
    ) => {
      const { roomId, username, color } = data;
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
    const roomId = getRoomForSocket(socket.id);
    if (!roomId) return;

    if (!isOwner(roomId, socket.id)) {
      socket.emit("error", { message: "Only the owner can close the room" });
      return;
    }

    closeRoom(roomId);
  });

  // --- scene:full (owner only, stores encrypted scene for late joiners) ---
  socket.on("scene:full", (data: { encryptedData: string; iv: string }) => {
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
  socket.on("scene:update", (data: { encryptedData: string; iv: string }) => {
    const roomId = getRoomForSocket(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit("scene:update", data);
  });

  // --- cursor:update (unencrypted pointer positions) ---
  socket.on(
    "cursor:update",
    (data: { pointer: { x: number; y: number }; button: string; username: string; color: string }) => {
      const roomId = getRoomForSocket(socket.id);
      if (!roomId) return;

      socket.to(roomId).emit("cursor:update", {
        socketId: socket.id,
        ...data,
      });
    },
  );

  // --- files:add (encrypted images) ---
  socket.on("files:add", (data: { encryptedData: string; iv: string }) => {
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
