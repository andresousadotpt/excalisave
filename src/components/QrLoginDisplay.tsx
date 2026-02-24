"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function QrLoginDisplay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrToken = searchParams.get("qr");

  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "consuming" | "signing_in">(
    qrToken ? "consuming" : "idle"
  );

  const consumeAndSignIn = useCallback(
    async (payload: { token: string } | { shortCode: string }) => {
      setStatus("consuming");
      setError("");
      try {
        const res = await fetch("/api/auth/qr/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid code");

        setStatus("signing_in");
        const result = await signIn("qr-login", {
          authToken: data.authToken,
          redirect: false,
        });

        if (result?.error) {
          setError("Login failed. Please try again.");
          setStatus("idle");
          return;
        }

        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("idle");
      }
    },
    [router]
  );

  // Auto-consume if ?qr=TOKEN is in URL
  useEffect(() => {
    if (qrToken) {
      consumeAndSignIn({ token: qrToken });
    }
  }, [qrToken, consumeAndSignIn]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (shortCode.length !== 6) return;
    consumeAndSignIn({ shortCode: shortCode.toUpperCase() });
  }

  if (status === "consuming" || status === "signing_in") {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {status === "signing_in" ? "Signing you in..." : "Verifying code..."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Open Excalisave on a device where you&apos;re already logged in, click
        the QR button, and enter the code shown:
      </p>
      <input
        type="text"
        value={shortCode}
        onChange={(e) =>
          setShortCode(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 6)
          )
        }
        placeholder="XXXXXX"
        maxLength={6}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-2xl text-center tracking-[0.3em]"
        autoFocus
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={shortCode.length !== 6}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Sign In
      </button>
    </form>
  );
}
