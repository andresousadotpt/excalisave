"use client";

import { useState } from "react";
import Link from "next/link";
import {signOut, useSession} from "next-auth/react";
import {ThemeToggle} from "@/components/ThemeToggle";
import {isAdminRole} from "@/lib/roles";

export function Navbar() {
    const {data: session} = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

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
                    <span className="hidden sm:inline">Excalisave</span>
                </Link>

                {/* Desktop nav */}
                <div className="hidden sm:flex items-center gap-4">
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
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors max-w-[200px] truncate"
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

                {/* Mobile: theme toggle + hamburger */}
                <div className="flex sm:hidden items-center gap-1">
                    <ThemeToggle />
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="sm:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    {isAdminRole(session?.user?.role ?? "") && (
                        <>
                            <Link
                                href="/dashboard"
                                onClick={() => setMenuOpen(false)}
                                className="block px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Drawings
                            </Link>
                            <Link
                                href="/admin"
                                onClick={() => setMenuOpen(false)}
                                className="block px-3 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Admin
                            </Link>
                        </>
                    )}
                    <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors truncate"
                    >
                        {session?.user?.email}
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </nav>
    );
}
