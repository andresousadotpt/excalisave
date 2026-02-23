"use client";

import Link from "next/link";
import {signOut, useSession} from "next-auth/react";
import {ThemeToggle} from "@/components/ThemeToggle";
import {isAdminRole} from "@/lib/roles";

export function Navbar() {
    const {data: session} = useSession();

    async function handleSignOut() {
        sessionStorage.removeItem("mk");
        await signOut({redirectTo: "/login"});
    }

    return (
        <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
                >
                    <img
                        src="/excalisave-logo.png"
                        alt=""
                        className="h-8 w-auto"
                        width={32}
                        height={32}
                    />
                    Excalisave
                </Link>
                <div className="flex items-center gap-4">
                    {isAdminRole(session?.user?.role ?? "") && (
                        <>
                            <Link
                                href="/dashboard"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                            >
                                Drawings
                            </Link>
                            <Link
                                href="/admin"
                                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                            >
                                Admin
                            </Link>
                        </>
                    )}
                    <Link
                        href="/account"
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        {session?.user?.email}
                    </Link>
                    <ThemeToggle />
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </nav>
    );
}
