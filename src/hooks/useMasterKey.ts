"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import React from "react";
import { exportMasterKey, importMasterKey } from "@/lib/crypto";

const SESSION_STORAGE_KEY = "mk";

interface MasterKeyContextValue {
  masterKey: CryptoKey | null;
  setMasterKey: (key: CryptoKey | null) => void;
  clearMasterKey: () => void;
  isUnlocked: boolean;
}

const MasterKeyContext = createContext<MasterKeyContextValue | null>(null);

export function MasterKeyProvider({ children }: { children: ReactNode }) {
  const [masterKey, setMasterKeyState] = useState<CryptoKey | null>(null);

  // Restore master key from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      importMasterKey(stored)
        .then((key) => setMasterKeyState(key))
        .catch(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
    }
  }, []);

  const setMasterKey = useCallback((key: CryptoKey | null) => {
    setMasterKeyState(key);
    if (key) {
      exportMasterKey(key)
        .then((b64) => sessionStorage.setItem(SESSION_STORAGE_KEY, b64))
        .catch(() => {});
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  const clearMasterKey = useCallback(() => {
    setMasterKeyState(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  return React.createElement(
    MasterKeyContext.Provider,
    {
      value: {
        masterKey,
        setMasterKey,
        clearMasterKey,
        isUnlocked: masterKey !== null,
      },
    },
    children
  );
}

export function useMasterKey() {
  const ctx = useContext(MasterKeyContext);
  if (!ctx) {
    throw new Error("useMasterKey must be used within MasterKeyProvider");
  }
  return ctx;
}
