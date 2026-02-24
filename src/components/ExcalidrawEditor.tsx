"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDrawing } from "@/hooks/useDrawing";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { DrawingFloatingBar } from "@/components/DrawingFloatingBar";
import { CollabShareDialog } from "@/components/CollabShareDialog";
import { useMasterKey } from "@/hooks/useMasterKey";
import { useCollaboration } from "@/hooks/useCollaboration";
import { encryptDrawing, decryptDrawing } from "@/lib/crypto";
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
  const { masterKey, isUnlocked } = useMasterKey();
  const { sceneData, drawingName, projectName, projectColor, loading, error, saveDrawing } = useDrawing(drawingId);
  const excalidrawAPIRef = useRef<any>(null);
  const lastFingerprintRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [excalidrawMenuOpen, setExcalidrawMenuOpen] = useState(false);
  const librarySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [libraryItems, setLibraryItems] = useState<any[] | undefined>(undefined);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const collab = useCollaboration({
    excalidrawAPI: excalidrawAPIRef.current,
    mode: "owner",
  });

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
        gridModeEnabled: appState.gridModeEnabled,
        theme: appState.theme,
        zenModeEnabled: appState.zenModeEnabled,
        objectsSnapModeEnabled: appState.objectsSnapModeEnabled,
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      },
      files,
    });

    const thumbnail = (async (): Promise<string | null> => {
      try {
        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const nonDeletedElements = elements.filter(
          (el: any) => !el.isDeleted
        );
        const blob = await exportToBlob({
          elements: nonDeletedElements,
          appState,
          files,
          mimeType: "image/png",
          quality: 0.5,
          getDimensions: (contentWidth: number, contentHeight: number) => {
            const maxW = 320;
            const maxH = 180;
            const scale = Math.min(maxW / contentWidth, maxH / contentHeight, 1);
            return {
              width: Math.round(contentWidth * scale),
              height: Math.round(contentHeight * scale),
              scale: 2,
            };
          },
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

  // Load global library on mount
  useEffect(() => {
    if (!isUnlocked || !masterKey) return;

    async function loadLibrary() {
      try {
        const res = await fetch("/api/library");
        if (!res.ok) return;
        const { encryptedLibrary, libraryIv } = await res.json();
        if (!encryptedLibrary || !libraryIv) {
          setLibraryItems([]);
          return;
        }
        const decrypted = await decryptDrawing(encryptedLibrary, libraryIv, masterKey!);
        setLibraryItems(JSON.parse(decrypted));
      } catch {
        setLibraryItems([]);
      }
    }

    loadLibrary();
  }, [isUnlocked, masterKey]);

  // Detect Excalidraw's mobile dropdown menu to hide our floating bar
  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const container = containerRef.current;
    const checkMenu = () => {
      const mobileMenu = container.querySelector(
        ".dropdown-menu--mobile, [data-testid='dropdown-menu']"
      );
      setExcalidrawMenuOpen(!!mobileMenu);
    };

    const observer = new MutationObserver(checkMenu);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ready]);

  // Handle #addLibrary hash URL for library installation from libraries.excalidraw.com
  useEffect(() => {
    if (!excalidrawAPIRef.current || !ready) return;

    const hash = window.location.hash;
    if (!hash.includes("addLibrary")) return;

    const params = new URLSearchParams(hash.slice(1));
    const libraryUrl = params.get("addLibrary");
    if (!libraryUrl) return;

    try {
      const url = new URL(libraryUrl);
      if (url.hostname !== "libraries.excalidraw.com") return;

      fetch(libraryUrl)
        .then((res) => res.blob())
        .then((blob) => {
          excalidrawAPIRef.current?.updateLibrary({
            libraryItems: blob,
            merge: true,
            prompt: true,
            defaultStatus: "unpublished",
          });
          // Clear hash after handling
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        })
        .catch((err) =>
          console.error("Failed to load library from URL:", err)
        );
    } catch {
      // Invalid URL, ignore
    }
  }, [ready]);

  // Save library on change (debounced)
  const handleLibraryChange = useCallback(
    (items: readonly any[]) => {
      if (!masterKey) return;

      if (librarySaveTimerRef.current) {
        clearTimeout(librarySaveTimerRef.current);
      }

      librarySaveTimerRef.current = setTimeout(async () => {
        try {
          const data = JSON.stringify(items);
          const { encryptedData, iv } = await encryptDrawing(data, masterKey);
          await fetch("/api/library", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encryptedLibrary: encryptedData, libraryIv: iv }),
          });
        } catch (err) {
          console.error("Library save failed:", err);
        }
      }, 1000);
    },
    [masterKey]
  );

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (!excalidrawAPIRef.current || !ready) return;

      const active = elements.filter((el: any) => !el.isDeleted);
      const versionSum = active.reduce(
        (s: number, el: any) => s + (el.version || 0),
        0
      );
      const fileCount = files ? Object.keys(files).length : 0;
      const fp = `${active.length}:${versionSum}:${fileCount}:${appState.viewBackgroundColor ?? ""}:${appState.gridSize ?? ""}:${appState.gridModeEnabled ?? ""}:${appState.theme ?? ""}:${appState.zenModeEnabled ?? ""}:${appState.objectsSnapModeEnabled ?? ""}:${appState.zoom?.value ?? ""}:${Math.round(appState.scrollX ?? 0)}:${Math.round(appState.scrollY ?? 0)}`;

      // First call = initial load baseline, don't mark dirty
      if (lastFingerprintRef.current === null) {
        lastFingerprintRef.current = fp;
        return;
      }

      if (fp === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fp;
      markDirty();
      collab.sendSceneUpdate(elements, appState, files);
    },
    [markDirty, ready, collab.sendSceneUpdate]
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

  if (!initialData || libraryItems === undefined) return null;

  return (
    <div className="h-full w-full relative" ref={containerRef}>
      {/* Bottom-center: back button + floating bar + save indicator */}
      {/* On mobile, pushed up above Excalidraw's own bottom toolbar */}
      <div className={`absolute bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 max-w-[calc(100vw-1rem)] transition-opacity duration-150 ${excalidrawMenuOpen ? "opacity-0 pointer-events-none" : ""}`}>
        <button
          onClick={() => guardNavigation(() => router.push("/dashboard"))}
          className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-colors flex-shrink-0"
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

        {process.env.NEXT_PUBLIC_COLLAB_URL && (
          <button
            onClick={async () => {
              if (!collab.isCollaborating) {
                await collab.startRoom();
              }
              setShowShareDialog(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 h-9 text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-colors whitespace-nowrap"
            title="Share for collaboration"
          >
            {collab.isCollaborating ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </>
            )}
          </button>
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
          libraryItems,
        }}
        onChange={handleChange}
        onLibraryChange={handleLibraryChange}
        libraryReturnUrl={
          typeof window !== "undefined" ? window.location.href : undefined
        }
        isCollaborating={collab.isCollaborating}
        onPointerUpdate={collab.isCollaborating ? collab.onPointerUpdate : undefined}
      />

      <CollabShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        shareUrl={collab.shareUrl}
        participants={collab.participants}
        onStopSharing={() => {
          collab.stopRoom();
          setShowShareDialog(false);
        }}
      />
    </div>
  );
}
