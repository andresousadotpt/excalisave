"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import React from "react";

interface MasterKeyContextValue {
  masterKey: CryptoKey | null;
  setMasterKey: (key: CryptoKey | null) => void;
  clearMasterKey: () => void;
  isUnlocked: boolean;
}

const MasterKeyContext = createContext<MasterKeyContextValue | null>(null);

export function MasterKeyProvider({ children }: { children: ReactNode }) {
  const [masterKey, setMasterKeyState] = useState<CryptoKey | null>(null);

  const setMasterKey = useCallback((key: CryptoKey | null) => {
    setMasterKeyState(key);
  }, []);

  const clearMasterKey = useCallback(() => {
    setMasterKeyState(null);
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
