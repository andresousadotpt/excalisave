"use client";

import { useState } from "react";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  drawingId: string;
  onUpdated: () => void;
}

export function TagSelector({ tags, selectedTagIds, drawingId, onUpdated }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function toggleTag(tagId: string) {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];

    setSaving(true);
    try {
      const res = await fetch(`/api/drawings/${drawingId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: newTagIds }),
      });
      if (res.ok) onUpdated();
    } finally {
      setSaving(false);
    }
  }

  if (tags.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        Tags
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                disabled={saving}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedTagIds.includes(tag.id)
                      ? "border-blue-600 bg-blue-600"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selectedTagIds.includes(tag.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {tag.color && (
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                )}
                <span className="text-gray-700 dark:text-gray-300 truncate">{tag.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
