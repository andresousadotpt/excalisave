"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  generateRoomKey,
  exportRoomKey,
  importRoomKey,
  encryptDrawing,
  decryptDrawing,
} from "@/lib/crypto";

export interface Participant {
  username: string;
  color: string;
}

export interface Collaborator {
  username: string;
  color: { background: string; stroke: string };
  pointer?: { x: number; y: number; tool: "pointer" | "laser" };
  button?: string;
  selectedElementIds?: Record<string, boolean>;
  isCurrentUser?: boolean;
  id?: string;
  avatarUrl?: string;
}

interface UseCollaborationOptions {
  excalidrawAPI: any;
  mode: "owner" | "guest";
  drawingId?: string;
}

interface UseCollaborationReturn {
  collabEnabled: boolean;
  isCollaborating: boolean;
  roomId: string | null;
  shareUrl: string | null;
  participants: Map<string, Participant>;
  error: string | null;
  roomClosed: boolean;
  startRoom: () => Promise<void>;
  stopRoom: () => void;
  joinRoom: (
    roomId: string,
    roomKeyB64: string,
    username: string,
    color: string
  ) => Promise<void>;
  onPointerUpdate: (payload: {
    pointer: { x: number; y: number; tool: "pointer" | "laser" };
    button: string;
  }) => void;
  sendSceneUpdate: (
    elements: readonly any[],
    appState: any,
    files: any
  ) => void;
  collaborators: Map<string, Collaborator>;
}

const CURSOR_THROTTLE_MS = 33; // ~30fps
const SCENE_DEBOUNCE_MS = 100;

let _collabUrlCache: string | null = null;

async function getCollabUrl(): Promise<string | null> {
  if (_collabUrlCache !== null) return _collabUrlCache || null;
  try {
    const res = await fetch("/api/collab/config");
    if (!res.ok) return null;
    const { url } = await res.json();
    _collabUrlCache = url || "";
    return url || null;
  } catch {
    return null;
  }
}

export function useCollaboration({
  excalidrawAPI,
  mode,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(
    () => new Map()
  );
  const [error, setError] = useState<string | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(
    () => new Map()
  );
  const [collabEnabled, setCollabEnabled] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const roomKeyRef = useRef<CryptoKey | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const lastCursorSendRef = useRef(0);
  const sceneUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const elementVersionsRef = useRef<Map<string, number>>(new Map());
  const usernameRef = useRef<string>("");
  const colorRef = useRef<string>("");

  // Check if collab server is configured
  useEffect(() => {
    getCollabUrl().then((url) => setCollabEnabled(!!url));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sceneUpdateTimerRef.current) {
        clearTimeout(sceneUpdateTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const setupSocketListeners = useCallback(
    (socket: Socket) => {
      socket.on(
        "scene:full",
        async (data: { encryptedData: string; iv: string }) => {
          if (!roomKeyRef.current || !excalidrawAPI) return;
          try {
            const decrypted = await decryptDrawing(
              data.encryptedData,
              data.iv,
              roomKeyRef.current
            );
            const scene = JSON.parse(decrypted);
            isApplyingRemoteRef.current = true;
            excalidrawAPI.updateScene({
              elements: scene.elements || [],
              appState: scene.appState
                ? {
                    viewBackgroundColor: scene.appState.viewBackgroundColor,
                    gridSize: scene.appState.gridSize,
                    gridModeEnabled: scene.appState.gridModeEnabled,
                  }
                : undefined,
              collaborators: excalidrawAPI.getAppState()?.collaborators,
            });
            if (scene.files && Object.keys(scene.files).length > 0) {
              excalidrawAPI.addFiles(
                Object.values(scene.files) as any[]
              );
            }
            // Update element versions from full scene
            const elVersions = elementVersionsRef.current;
            elVersions.clear();
            for (const el of scene.elements || []) {
              elVersions.set(el.id, el.version || 0);
            }
            isApplyingRemoteRef.current = false;
          } catch (err) {
            console.error("Failed to decrypt full scene:", err);
          }
        }
      );

      socket.on(
        "scene:update",
        async (data: { encryptedData: string; iv: string }) => {
          if (!roomKeyRef.current || !excalidrawAPI) return;
          try {
            const decrypted = await decryptDrawing(
              data.encryptedData,
              data.iv,
              roomKeyRef.current
            );
            const update = JSON.parse(decrypted);
            const remoteElements: any[] = update.elements || [];
            if (remoteElements.length === 0) return;

            isApplyingRemoteRef.current = true;

            // Reconcile: merge remote elements with local
            const currentElements = excalidrawAPI.getSceneElements() || [];
            const elementMap = new Map<string, any>();
            for (const el of currentElements) {
              elementMap.set(el.id, el);
            }
            for (const remoteEl of remoteElements) {
              const local = elementMap.get(remoteEl.id);
              if (!local || remoteEl.version > local.version) {
                elementMap.set(remoteEl.id, remoteEl);
              }
            }
            excalidrawAPI.updateScene({
              elements: Array.from(elementMap.values()),
            });

            // Update version tracking
            const elVersions = elementVersionsRef.current;
            for (const el of remoteElements) {
              elVersions.set(el.id, el.version || 0);
            }

            isApplyingRemoteRef.current = false;
          } catch (err) {
            console.error("Failed to decrypt scene update:", err);
          }
        }
      );

      socket.on(
        "files:add",
        async (data: { encryptedData: string; iv: string }) => {
          if (!roomKeyRef.current || !excalidrawAPI) return;
          try {
            const decrypted = await decryptDrawing(
              data.encryptedData,
              data.iv,
              roomKeyRef.current
            );
            const files = JSON.parse(decrypted);
            excalidrawAPI.addFiles(
              Object.values(files) as any[]
            );
          } catch (err) {
            console.error("Failed to decrypt files:", err);
          }
        }
      );

      socket.on(
        "cursor:update",
        (data: {
          socketId: string;
          username: string;
          color: string;
          pointer: { x: number; y: number; tool?: "pointer" | "laser" };
          button: string;
        }) => {
          const collaborator: Collaborator = {
            username: data.username,
            color: { background: data.color, stroke: data.color },
            pointer: {
              x: data.pointer.x,
              y: data.pointer.y,
              tool: data.pointer.tool || "pointer",
            },
            button: data.button,
            id: data.socketId,
          };

          setCollaborators((prev) => {
            const next = new Map(prev);
            next.set(data.socketId, collaborator);
            return next;
          });

          // Push collaborators to Excalidraw so cursors render
          if (excalidrawAPI) {
            const appState = excalidrawAPI.getAppState();
            const collabMap = new Map(appState?.collaborators || new Map());
            collabMap.set(data.socketId, collaborator);
            excalidrawAPI.updateScene({ collaborators: collabMap });
          }
        }
      );

      socket.on(
        "participant:joined",
        (data: { socketId: string; username: string; color: string }) => {
          setParticipants((prev) => {
            const next = new Map(prev);
            next.set(data.socketId, {
              username: data.username,
              color: data.color,
            });
            return next;
          });
        }
      );

      socket.on("participant:left", (data: { socketId: string }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          next.delete(data.socketId);
          return next;
        });
        setCollaborators((prev) => {
          const next = new Map(prev);
          next.delete(data.socketId);
          return next;
        });
        // Remove from Excalidraw's collaborators
        if (excalidrawAPI) {
          const appState = excalidrawAPI.getAppState();
          const collabMap = new Map(appState?.collaborators || new Map());
          collabMap.delete(data.socketId);
          excalidrawAPI.updateScene({ collaborators: collabMap });
        }
      });

      socket.on("room:closed", () => {
        setRoomClosed(true);
        setIsCollaborating(false);
        socket.disconnect();
        socketRef.current = null;
      });

      socket.on("disconnect", () => {
        if (!roomClosed) {
          setError("Disconnected from collaboration server");
          setIsCollaborating(false);
        }
      });
    },
    [excalidrawAPI, roomClosed]
  );

  const startRoom = useCallback(async () => {
    const collabUrl = await getCollabUrl();
    if (!collabUrl) {
      setError("Collaboration server not configured");
      return;
    }
    if (!excalidrawAPI) {
      setError("Editor not ready");
      return;
    }

    try {
      const key = await generateRoomKey();
      roomKeyRef.current = key;
      const keyB64 = await exportRoomKey(key);

      const socket = io(collabUrl, {
        transports: ["websocket"],
        reconnection: false,
      });

      socketRef.current = socket;

      await new Promise<void>((resolve, reject) => {
        socket.on("connect", () => resolve());
        socket.on("connect_error", (err) =>
          reject(new Error(`Connection failed: ${err.message}`))
        );
        setTimeout(() => reject(new Error("Connection timeout")), 5000);
      });

      // Create room
      const newRoomId = await new Promise<string>((resolve, reject) => {
        socket.emit(
          "room:create",
          {},
          (response: { roomId?: string; error?: string }) => {
            if (response.error) reject(new Error(response.error));
            else resolve(response.roomId!);
          }
        );
        setTimeout(() => reject(new Error("Room creation timeout")), 5000);
      });

      setRoomId(newRoomId);
      const url = `${window.location.origin}/collab/${newRoomId}#key=${keyB64}`;
      setShareUrl(url);
      setIsCollaborating(true);
      setError(null);

      setupSocketListeners(socket);

      // Send current scene as initial full scene
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const sceneData = JSON.stringify({
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
          gridModeEnabled: appState.gridModeEnabled,
        },
        files,
      });

      const encrypted = await encryptDrawing(sceneData, key);
      socket.emit("scene:full", encrypted);

      // Track initial element versions
      const elVersions = elementVersionsRef.current;
      elVersions.clear();
      for (const el of elements) {
        elVersions.set(el.id, el.version || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start room");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [excalidrawAPI, setupSocketListeners]);

  const stopRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("room:close");
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsCollaborating(false);
    setRoomId(null);
    setShareUrl(null);
    setParticipants(new Map());
    setCollaborators(new Map());
    roomKeyRef.current = null;
    elementVersionsRef.current.clear();
  }, []);

  const joinRoom = useCallback(
    async (
      joinRoomId: string,
      roomKeyB64: string,
      username: string,
      color: string
    ) => {
      const collabUrl = await getCollabUrl();
      if (!collabUrl) {
        setError("Collaboration server not configured");
        return;
      }

      try {
        const key = await importRoomKey(roomKeyB64);
        roomKeyRef.current = key;
        usernameRef.current = username;
        colorRef.current = color;

        const socket = io(collabUrl, {
          transports: ["websocket"],
          reconnection: false,
        });

        socketRef.current = socket;

        await new Promise<void>((resolve, reject) => {
          socket.on("connect", () => resolve());
          socket.on("connect_error", (err) =>
            reject(new Error(`Connection failed: ${err.message}`))
          );
          setTimeout(() => reject(new Error("Connection timeout")), 5000);
        });

        setupSocketListeners(socket);

        // Join room
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            "room:join",
            { roomId: joinRoomId, username, color },
            (response: { error?: string; participants?: Record<string, Participant> }) => {
              if (response.error) reject(new Error(response.error));
              else {
                if (response.participants) {
                  setParticipants(new Map(Object.entries(response.participants)));
                }
                resolve();
              }
            }
          );
          setTimeout(() => reject(new Error("Join timeout")), 5000);
        });

        setRoomId(joinRoomId);
        setIsCollaborating(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join room");
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }
    },
    [setupSocketListeners]
  );

  // Scene change handler - call this from Excalidraw onChange
  const sendSceneUpdate = useCallback(
    (elements: readonly any[], _appState: any, files: any) => {
      if (
        !socketRef.current ||
        !roomKeyRef.current ||
        !isCollaborating ||
        isApplyingRemoteRef.current
      )
        return;

      // Diff: find elements with newer versions
      const elVersions = elementVersionsRef.current;
      const changed: any[] = [];
      for (const el of elements) {
        const lastVersion = elVersions.get(el.id) ?? -1;
        if ((el.version || 0) > lastVersion) {
          changed.push(el);
          elVersions.set(el.id, el.version || 0);
        }
      }

      if (changed.length === 0) return;

      // Debounce scene updates
      if (sceneUpdateTimerRef.current) {
        clearTimeout(sceneUpdateTimerRef.current);
      }

      sceneUpdateTimerRef.current = setTimeout(async () => {
        try {
          const updateData = JSON.stringify({ elements: changed });
          const encrypted = await encryptDrawing(updateData, roomKeyRef.current!);
          socketRef.current?.emit("scene:update", encrypted);
        } catch (err) {
          console.error("Failed to encrypt scene update:", err);
        }
      }, SCENE_DEBOUNCE_MS);

      // Check for new files
      if (files && Object.keys(files).length > 0) {
        // Simple approach: send all files on change (server/clients deduplicate)
        // A more sophisticated approach would track which files have been sent
        const sendFiles = async () => {
          try {
            const filesData = JSON.stringify(files);
            const encrypted = await encryptDrawing(
              filesData,
              roomKeyRef.current!
            );
            socketRef.current?.emit("files:add", encrypted);
          } catch (err) {
            console.error("Failed to encrypt files:", err);
          }
        };
        sendFiles();
      }
    },
    [isCollaborating]
  );

  const onPointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number; tool: "pointer" | "laser" }; button: string }) => {
      if (!socketRef.current || !isCollaborating) return;

      const now = Date.now();
      if (now - lastCursorSendRef.current < CURSOR_THROTTLE_MS) return;
      lastCursorSendRef.current = now;

      socketRef.current.emit("cursor:update", {
        pointer: { x: payload.pointer.x, y: payload.pointer.y, tool: payload.pointer.tool },
        button: payload.button,
        username: usernameRef.current || (mode === "owner" ? "Owner" : "Guest"),
        color: colorRef.current || "#4f46e5",
      });
    },
    [isCollaborating, mode]
  );

  return {
    collabEnabled,
    isCollaborating,
    roomId,
    shareUrl,
    participants,
    error,
    roomClosed,
    startRoom,
    stopRoom,
    joinRoom,
    onPointerUpdate,
    collaborators,
    sendSceneUpdate,
  };
}
