"use client";

interface UnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedChangesDialog({ open, onStay, onLeave }: UnsavedChangesDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Unsaved Changes
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onStay}
            className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-colors"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-4 py-2.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
