"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCollaboration } from "@/hooks/useCollaboration";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  { ssr: false }
);

function generatePastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
}

interface CollabEditorProps {
  roomId: string;
}

export function CollabEditor({ roomId }: CollabEditorProps) {
  const excalidrawAPIRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [joined, setJoined] = useState(false);
  const colorRef = useRef(generatePastelColor());

  const collab = useCollaboration({
    excalidrawAPI: excalidrawAPIRef.current,
    mode: "guest",
  });

  // Extract room key from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setKeyError(true);
      return;
    }
    const params = new URLSearchParams(hash.slice(1));
    const key = params.get("key");
    if (!key) {
      setKeyError(true);
      return;
    }
    setRoomKey(key);

    // Check localStorage for saved username
    const saved = localStorage.getItem("collab-username");
    if (saved) {
      setUsername(saved);
    }
  }, []);

  // Join room once we have key, username, and excalidraw is ready
  useEffect(() => {
    if (!roomKey || !username || !ready || joined) return;
    setJoined(true);
    collab.joinRoom(roomId, roomKey, username, colorRef.current);
  }, [roomKey, username, ready, joined, roomId, collab.joinRoom]);

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (!excalidrawAPIRef.current || !ready) return;
      collab.sendSceneUpdate(elements, appState, files);
    },
    [ready, collab.sendSceneUpdate]
  );

  function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    localStorage.setItem("collab-username", trimmed);
    setUsername(trimmed);
  }

  // Error: no key in hash
  if (keyError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <p className="text-red-500 text-lg font-medium">Invalid collaboration link</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            The link is missing the encryption key. Ask the owner for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Room closed by owner
  if (collab.roomClosed) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <p className="text-gray-900 dark:text-gray-100 text-lg font-medium">
            Session ended by owner
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            The collaboration session has been closed.
          </p>
        </div>
      </div>
    );
  }

  // Connection error
  if (collab.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <p className="text-red-500 text-lg font-medium">Connection error</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {collab.error}
          </p>
        </div>
      </div>
    );
  }

  // Prompt for username
  if (!username) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Join Collaboration
          </h2>
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Your name"
              required
              maxLength={30}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!usernameInput.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const participantCount = collab.participants.size + 1; // +1 for self

  return (
    <div className="h-full w-full relative">
      {/* Participant count pill - bottom right */}
      <div className="absolute bottom-20 sm:bottom-4 right-4 z-30">
        <div className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {participantCount} {participantCount === 1 ? "person" : "people"}
        </div>
      </div>

      <Excalidraw
        excalidrawAPI={(api: any) => {
          excalidrawAPIRef.current = api;
          setReady(true);
        }}
        initialData={{
          elements: [],
          appState: {},
          files: {},
        }}
        onChange={handleChange}
        isCollaborating={true}
        onPointerUpdate={collab.onPointerUpdate}
      />
    </div>
  );
}
