"use client";

import { useState } from "react";

interface Project {
  id: string;
  name: string;
  color: string | null;
  drawingCount: number;
}

interface ManageProjectsDialogProps {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onUpdated: () => void;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"];

export function ManageProjectsDialog({ open, projects, onClose, onUpdated }: ManageProjectsDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color: color ?? undefined }),
      });
      if (res.ok) {
        setName("");
        setColor(null);
        onUpdated();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    if (res.ok) {
      setEditId(null);
      onUpdated();
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      onUpdated();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Manage Projects</h2>

        {/* Create form */}
        <form onSubmit={handleCreate} className="space-y-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New project name"
              required
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex gap-1 items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(color === c ? null : c)}
                className={`w-7 h-7 rounded-full border-2 flex-shrink-0 ${color === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </form>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No projects yet</p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                {editId === project.id ? (
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(project.id)} className="text-xs px-2 py-1.5 text-blue-600 hover:text-blue-700">Save</button>
                      <button onClick={() => setEditId(null)} className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700">Cancel</button>
                    </div>
                    <div className="flex gap-1 items-center">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(editColor === c ? null : c)}
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ${editColor === c ? "border-gray-900 dark:border-white" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {project.color && (
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    )}
                    <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">{project.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{project.drawingCount} drawings</span>
                    <button
                      onClick={() => { setEditId(project.id); setEditName(project.name); setEditColor(project.color); }}
                      className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Edit
                    </button>
                    {deleteConfirm === project.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(project.id)} className="text-xs px-2 py-1.5 text-red-600 hover:text-red-700">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1.5 text-gray-500">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(project.id)} className="text-xs px-2 py-1.5 text-red-500 hover:text-red-700">Delete</button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
