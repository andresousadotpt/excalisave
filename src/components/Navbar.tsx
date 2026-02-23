"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useMasterKey } from "@/hooks/useMasterKey";

export function Navbar() {
  const { data: session } = useSession();
  const { clearMasterKey } = useMasterKey();

  async function handleSignOut() {
    clearMasterKey();
    await signOut({ redirectTo: "/login" });
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href={session?.user?.role === "admin" ? "/admin" : "/dashboard"}
          className="text-xl font-bold text-gray-900"
        >
          Excalisave
        </Link>
        <div className="flex items-center gap-4">
          {session?.user?.role === "admin" && (
            <Link href="/admin" className="text-sm text-purple-600 hover:text-purple-800 transition-colors">
              Admin
            </Link>
          )}
          <span className="text-sm text-gray-600">{session?.user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
