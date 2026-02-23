"use client";

import { useState } from "react";
import { useMasterKey } from "@/hooks/useMasterKey";
import { encryptDrawing } from "@/lib/crypto";
import { useRouter } from "next/navigation";

interface ProjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface CreateDrawingDialogProps {
  open: boolean;
  onClose: () => void;
  projects?: ProjectOption[];
}

const EMPTY_SCENE = JSON.stringify({
  type: "excalidraw",
  version: 2,
  elements: [],
  appState: {},
  files: {},
});

export function CreateDrawingDialog({ open, onClose, projects }: CreateDrawingDialogProps) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const { masterKey } = useMasterKey();
  const router = useRouter();

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!masterKey || !name.trim()) return;

    setLoading(true);
    try {
      const { encryptedData, iv } = await encryptDrawing(EMPTY_SCENE, masterKey);

      const res = await fetch("/api/drawings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          encryptedData,
          iv,
          ...(projectId ? { projectId } : {}),
        }),
      });

      if (!res.ok) throw new Error("Failed to create drawing");

      const drawing = await res.json();
      onClose();
      router.push(`/draw/${drawing.id}`);
    } catch (error) {
      console.error("Failed to create drawing:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          New Drawing
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Drawing name"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoFocus
          />
          {projects && projects.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
