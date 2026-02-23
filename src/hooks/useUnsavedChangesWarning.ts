"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseUnsavedChangesWarningOptions {
  isDirty: () => boolean;
}

export function useUnsavedChangesWarning({ isDirty }: UseUnsavedChangesWarningOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // Browser close / refresh guard
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const guardNavigation = useCallback(
    (navigate: () => void) => {
      if (isDirty()) {
        pendingNavigationRef.current = navigate;
        setShowWarning(true);
      } else {
        navigate();
      }
    },
    [isDirty],
  );

  const confirmNavigation = useCallback(() => {
    setShowWarning(false);
    const navigate = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    navigate?.();
  }, []);

  const cancelNavigation = useCallback(() => {
    setShowWarning(false);
    pendingNavigationRef.current = null;
  }, []);

  return { guardNavigation, showWarning, confirmNavigation, cancelNavigation };
}
