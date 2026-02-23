"use client";

import { useState, useEffect, useCallback } from "react";
import { useMasterKey } from "@/hooks/useMasterKey";
import { decryptDrawing, encryptDrawing } from "@/lib/crypto";

interface DrawingData {
  id: string;
  name: string;
  encryptedData: string;
  iv: string;
}

export function useDrawing(drawingId: string) {
  const { masterKey, isUnlocked } = useMasterKey();
  const [sceneData, setSceneData] = useState<string | null>(null);
  const [drawingName, setDrawingName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and decrypt
  useEffect(() => {
    if (!isUnlocked || !masterKey) return;

    async function load() {
      try {
        const res = await fetch(`/api/drawings/${drawingId}`);
        if (!res.ok) throw new Error("Failed to load drawing");

        const drawing: DrawingData = await res.json();
        setDrawingName(drawing.name);

        const decrypted = await decryptDrawing(
          drawing.encryptedData,
          drawing.iv,
          masterKey!
        );
        setSceneData(decrypted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [drawingId, masterKey, isUnlocked]);

  // Encrypt and save
  const saveDrawing = useCallback(
    async (data: string, thumbnail?: string | null) => {
      if (!masterKey) return;

      const { encryptedData, iv } = await encryptDrawing(data, masterKey);

      await fetch(`/api/drawings/${drawingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData, iv, thumbnail }),
      });
    },
    [drawingId, masterKey]
  );

  return { sceneData, drawingName, loading, error, saveDrawing };
}
