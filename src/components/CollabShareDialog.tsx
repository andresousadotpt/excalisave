"use client";

import { useState } from "react";
import type { Participant } from "@/hooks/useCollaboration";

interface CollabShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string | null;
  participants: Map<string, Participant>;
  onStopSharing: () => void;
}

export function CollabShareDialog({
  open,
  onOpenChange,
  shareUrl,
  participants,
  onStopSharing,
}: CollabShareDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
  }

  const participantList = Array.from(participants.values());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Share Drawing
        </h2>

        {shareUrl && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Share link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Participants
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {participantList.length} connected
            </span>
          </div>
          {participantList.length > 0 ? (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {participantList.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.username}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No one else has joined yet.
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onStopSharing}
            className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
          >
            Stop Sharing
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
