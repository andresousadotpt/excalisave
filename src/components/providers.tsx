"use client";

import { SessionProvider } from "next-auth/react";
import { MasterKeyProvider } from "@/hooks/useMasterKey";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MasterKeyProvider>{children}</MasterKeyProvider>
    </SessionProvider>
  );
}
