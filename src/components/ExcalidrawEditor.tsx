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

  const handleChange = useCallback(() => {
    if (!excalidrawAPIRef.current || !ready) return;
    markDirty();
  }, [markDirty, ready]);

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
      {/* Save status indicator */}
      <div className="absolute top-3 right-3 z-10">
        {saveStatus === "saving" && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            Saving...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            Saved
          </span>
        )}
      </div>

      {/* Back button */}
      <div className="absolute top-3 left-3 z-10">
        <button
          onClick={() => guardNavigation(() => router.push("/dashboard"))}
          className="flex items-center justify-center w-7 h-7 bg-white/80 backdrop-blur rounded shadow-sm hover:bg-white transition-colors"
          title="Back to drawings"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Bottom-center floating bar */}
      <DrawingFloatingBar
        currentDrawingId={drawingId}
        currentDrawingName={drawingName}
        projectName={projectName}
        projectColor={projectColor}
        guardNavigation={guardNavigation}
      />

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
