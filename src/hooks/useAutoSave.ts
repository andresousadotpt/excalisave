"use client";

import { useRef, useCallback, useState } from "react";

interface UseAutoSaveOptions {
  onSave: (data: string, thumbnail?: string | null) => Promise<void>;
  getSceneData: () => { data: string; thumbnail: Promise<string | null> } | null;
  delay?: number;
}

export function useAutoSave({ onSave, getSceneData, delay = 3000 }: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const markDirty = useCallback(() => {
    dirtyRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;

      const sceneResult = getSceneData();
      if (!sceneResult) return;

      setSaveStatus("saving");
      try {
        const thumbnail = await sceneResult.thumbnail;
        await onSave(sceneResult.data, thumbnail);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("idle");
      }
    }, delay);
  }, [onSave, getSceneData, delay]);

  const isDirty = useCallback(() => dirtyRef.current, []);

  return { markDirty, saveStatus, isDirty };
}
