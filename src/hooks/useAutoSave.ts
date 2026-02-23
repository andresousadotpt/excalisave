"use client";

import { useRef, useCallback, useState } from "react";

interface UseAutoSaveOptions {
  onSave: (data: string, thumbnail?: string | null) => Promise<void>;
  delay?: number;
}

export function useAutoSave({ onSave, delay = 3000 }: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<string | null>(null);
  const pendingThumbnailRef = useRef<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const triggerSave = useCallback(
    (data: string, thumbnail?: string | null) => {
      pendingDataRef.current = data;
      if (thumbnail !== undefined) {
        pendingThumbnailRef.current = thumbnail ?? null;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        if (pendingDataRef.current === null) return;

        setSaveStatus("saving");
        try {
          await onSave(pendingDataRef.current, pendingThumbnailRef.current);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (err) {
          console.error("Auto-save failed:", err);
          setSaveStatus("idle");
        }
      }, delay);
    },
    [onSave, delay]
  );

  return { triggerSave, saveStatus };
}
