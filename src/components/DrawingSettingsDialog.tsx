"use client";

import { useState, useEffect } from "react";

interface ProjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

interface DrawingSettingsDialogProps {
  open: boolean;
  drawingId: string;
  drawingName: string;
  projectId: string | null;
  tagIds: string[];
  projects: ProjectOption[];
  tags: TagOption[];
  onClose: () => void;
  onUpdated: () => void;
}

export function DrawingSettingsDialog({
  open,
  drawingId,
  drawingName,
  projectId,
  tagIds,
  projects,
  tags,
  onClose,
  onUpdated,
}: DrawingSettingsDialogProps) {
  const [name, setName] = useState(drawingName);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(tagIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
      setName(drawingName);
      setSelectedProjectId(projectId ?? "");
      setSelectedTagIds(tagIds);
      setError("");
    }
  }, [open, drawingName, projectId, tagIds]);

  if (!open) return null;

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");

    try {
      // Update drawing name + project
      const drawingUpdate: Record<string, unknown> = {};
      if (name.trim() !== drawingName) {
        drawingUpdate.name = name.trim();
      }
      const newProjectId = selectedProjectId || null;
      if (newProjectId !== projectId) {
        drawingUpdate.projectId = newProjectId;
      }

      if (Object.keys(drawingUpdate).length > 0) {
        const res = await fetch(`/api/drawings/${drawingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(drawingUpdate),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update drawing");
        }
      }

      // Update tags if changed
      const tagsChanged =
        selectedTagIds.length !== tagIds.length ||
        selectedTagIds.some((id) => !tagIds.includes(id));

      if (tagsChanged) {
        const res = await fetch(`/api/drawings/${drawingId}/tags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: selectedTagIds }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update tags");
        }
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Drawing Settings</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tag.color && (
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedTagIds.includes(tag.id) ? "opacity-80" : ""}`}
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
