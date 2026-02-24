"use client";

import { useState, useRef, useCallback } from "react";
import { useMasterKey } from "@/hooks/useMasterKey";
import { decryptDrawing } from "@/lib/crypto";

type Status = "idle" | "fetching" | "decrypting" | "zipping" | "done" | "error";

interface ExportDrawing {
  id: string;
  name: string;
  encryptedData: string;
  iv: string;
  projectName: string | null;
}

interface BackupDrawingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 200);
}

export function BackupDrawingsDialog({ open, onClose }: BackupDrawingsDialogProps) {
  const { masterKey } = useMasterKey();
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "" });
  const [error, setError] = useState("");
  const [failedCount, setFailedCount] = useState(0);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress({ current: 0, total: 0, name: "" });
    setError("");
    setFailedCount(0);
    abortRef.current = false;
  }, []);

  function handleClose() {
    abortRef.current = true;
    reset();
    onClose();
  }

  async function handleBackup() {
    if (!masterKey) return;
    abortRef.current = false;

    try {
      // Fetch drawings
      setStatus("fetching");
      const res = await fetch("/api/drawings/export");
      if (!res.ok) throw new Error("Failed to fetch drawings");
      const drawings: ExportDrawing[] = await res.json();

      if (abortRef.current) return;

      if (drawings.length === 0) {
        setError("No drawings to backup.");
        setStatus("error");
        return;
      }

      // Decrypt drawings
      setStatus("decrypting");
      setProgress({ current: 0, total: drawings.length, name: "" });

      const decrypted: { name: string; projectName: string | null; data: string }[] = [];
      let failed = 0;

      for (let i = 0; i < drawings.length; i++) {
        if (abortRef.current) return;
        const d = drawings[i];
        setProgress({ current: i + 1, total: drawings.length, name: d.name });

        try {
          const data = await decryptDrawing(d.encryptedData, d.iv, masterKey);
          decrypted.push({ name: d.name, projectName: d.projectName, data });
        } catch {
          failed++;
        }
      }

      if (abortRef.current) return;
      setFailedCount(failed);

      if (decrypted.length === 0) {
        setError("All drawings failed to decrypt.");
        setStatus("error");
        return;
      }

      // Build ZIP
      setStatus("zipping");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Track used names per folder for dedup (case-insensitive)
      const usedNames = new Map<string, Map<string, number>>();

      for (const item of decrypted) {
        const folderKey = item.projectName ?? "";
        const folder = item.projectName ? zip.folder(sanitizeFileName(item.projectName))! : zip;

        if (!usedNames.has(folderKey)) {
          usedNames.set(folderKey, new Map());
        }
        const folderNames = usedNames.get(folderKey)!;

        const baseName = sanitizeFileName(item.name || "Untitled");
        const lowerBase = baseName.toLowerCase();
        const count = (folderNames.get(lowerBase) ?? 0) + 1;
        folderNames.set(lowerBase, count);

        const fileName = count === 1
          ? `${baseName}.excalidraw`
          : `${baseName} (${count}).excalidraw`;

        // Parse the decrypted data and ensure it has excalidraw format
        let fileContent: string;
        try {
          const parsed = JSON.parse(item.data);
          // Ensure the file has the excalidraw format markers
          const excalidrawData = {
            type: "excalidraw",
            version: 2,
            elements: parsed.elements ?? [],
            appState: parsed.appState ?? {},
            files: parsed.files ?? {},
          };
          fileContent = JSON.stringify(excalidrawData, null, 2);
        } catch {
          // If parsing fails, write raw data
          fileContent = item.data;
        }

        folder.file(fileName, fileContent);
      }

      if (abortRef.current) return;

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `excalisave-backup-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("done");
    } catch (err) {
      if (abortRef.current) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Backup Drawings
        </h2>

        {status === "idle" && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Export all your drawings as <code>.excalidraw</code> files in a ZIP archive, organized by project folders.
              These files can be opened directly in excalidraw.com.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBackup}
                className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Backup
              </button>
            </div>
          </>
        )}

        {status === "fetching" && (
          <div className="flex items-center gap-3 py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Fetching drawings...</span>
          </div>
        )}

        {status === "decrypting" && (
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Decrypting {progress.current} of {progress.total}...
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {progress.name && (
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{progress.name}</p>
            )}
          </div>
        )}

        {status === "zipping" && (
          <div className="flex items-center gap-3 py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Creating archive...</span>
          </div>
        )}

        {status === "done" && (
          <>
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">
              Backup complete! Your download should start automatically.
            </p>
            {failedCount > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                {progress.total - failedCount} of {progress.total} drawings exported ({failedCount} failed to decrypt).
              </p>
            )}
            {failedCount === 0 && <div className="mb-4" />}
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { reset(); handleBackup(); }}
                className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
