"use client";

import { SessionProvider } from "next-auth/react";
import { MasterKeyProvider } from "@/hooks/useMasterKey";
import { ThemeProvider } from "@/hooks/useTheme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <MasterKeyProvider>{children}</MasterKeyProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
