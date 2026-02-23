"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDrawing } from "@/hooks/useDrawing";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { DrawingFloatingBar } from "@/components/DrawingFloatingBar";
import { useMasterKey } from "@/hooks/useMasterKey";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  { ssr: false }
);

interface ExcalidrawEditorProps {
  drawingId: string;
}

export function ExcalidrawEditor({ drawingId }: ExcalidrawEditorProps) {
  const router = useRouter();
  const { isUnlocked } = useMasterKey();
  const { sceneData, drawingName, projectName, projectColor, loading, error, saveDrawing } = useDrawing(drawingId);
  const excalidrawAPIRef = useRef<any>(null);
  const lastFingerprintRef = useRef<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [ready, setReady] = useState(false);

  const getSceneData = useCallback(() => {
    const api = excalidrawAPIRef.current;
    if (!api || !ready) return null;

    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();

    const data = JSON.stringify({
      type: "excalidraw",
      version: 2,
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
      },
      files,
    });

    const thumbnail = (async (): Promise<string | null> => {
      try {
        const blob = await api.exportToBlob({
          mimeType: "image/png",
          quality: 0.5,
          getDimensions: () => ({ width: 320, height: 180, scale: 1 }),
        });
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    })();

    return { data, thumbnail };
  }, [ready]);

  const { markDirty, saveStatus, isDirty } = useAutoSave({
    onSave: async (data: string, thumbnail?: string | null) => {
      await saveDrawing(data, thumbnail);
    },
    getSceneData,
    delay: 1000,
  });

  const { guardNavigation, showWarning, confirmNavigation, cancelNavigation } =
    useUnsavedChangesWarning({ isDirty });

  // Parse initial data once when sceneData is available
  const hasInitialized = useRef(false);
  if (sceneData && !hasInitialized.current) {
    hasInitialized.current = true;
    try {
      const parsed = JSON.parse(sceneData);
      setInitialData(parsed);
    } catch {
      setInitialData({ elements: [], appState: {}, files: {} });
    }
  }

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (!excalidrawAPIRef.current || !ready) return;

      const active = elements.filter((el: any) => !el.isDeleted);
      const versionSum = active.reduce(
        (s: number, el: any) => s + (el.version || 0),
        0
      );
      const fileCount = files ? Object.keys(files).length : 0;
      const fp = `${active.length}:${versionSum}:${fileCount}:${appState.viewBackgroundColor ?? ""}:${appState.gridSize ?? ""}`;

      // First call = initial load baseline, don't mark dirty
      if (lastFingerprintRef.current === null) {
        lastFingerprintRef.current = fp;
        return;
      }

      if (fp === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fp;
      markDirty();
    },
    [markDirty, ready]
  );

  if (!isUnlocked) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!initialData) return null;

  return (
    <div className="h-full w-full relative">
      {/* Bottom-center: back button + floating bar + save indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        <button
          onClick={() => guardNavigation(() => router.push("/dashboard"))}
          className="flex items-center justify-center w-9 h-9 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-colors"
          title="Back to drawings"
        >
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <DrawingFloatingBar
          currentDrawingId={drawingId}
          currentDrawingName={drawingName}
          projectName={projectName}
          projectColor={projectColor}
          guardNavigation={guardNavigation}
        />

        {saveStatus !== "idle" && (
          <span
            className={`flex items-center gap-1.5 px-3 h-9 text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap ${
              saveStatus === "saving"
                ? "text-yellow-700 dark:text-yellow-300"
                : "text-green-700 dark:text-green-300"
            }`}
          >
            {saveStatus === "saving" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                Saving
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            )}
          </span>
        )}
      </div>

      <UnsavedChangesDialog
        open={showWarning}
        onStay={cancelNavigation}
        onLeave={confirmNavigation}
      />

      <Excalidraw
        excalidrawAPI={(api: any) => {
          excalidrawAPIRef.current = api;
          setReady(true);
        }}
        initialData={{
          elements: initialData.elements || [],
          appState: initialData.appState || {},
          files: initialData.files || {},
        }}
        onChange={handleChange}
      />
    </div>
  );
}
