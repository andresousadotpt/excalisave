"use client";

import { useState } from "react";

interface DeleteDrawingDialogProps {
  drawingId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteDrawingDialog({
  drawingId,
  onClose,
  onDeleted,
}: DeleteDrawingDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!drawingId) return null;

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/drawings/${drawingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted();
      onClose();
    } catch (error) {
      console.error("Failed to delete drawing:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">
          Delete Drawing
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This action cannot be undone. The drawing data will be permanently deleted.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
