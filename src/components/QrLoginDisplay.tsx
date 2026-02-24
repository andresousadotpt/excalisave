"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function QrLoginDisplay() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "approved" | "signing_in">("loading");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createToken = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/qr/create", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create QR code");
      }
      const data = await res.json();
      setToken(data.token);
      setShortCode(data.shortCode);
      setQrUrl(data.qrUrl);
      setExpiresAt(new Date(data.expiresAt).getTime());
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("ready");
    }
  }, []);

  // Create token on mount
  useEffect(() => {
    createToken();
  }, [createToken]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setToken(null);
        setStatus("ready");
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Poll for approval
  useEffect(() => {
    if (!token || status !== "ready") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/auth/qr/status?token=${token}`);
        const data = await res.json();

        if (data.status === "approved" && data.authToken) {
          setStatus("approved");
          if (pollRef.current) clearInterval(pollRef.current);

          setStatus("signing_in");
          const result = await signIn("qr-login", {
            authToken: data.authToken,
            redirect: false,
          });

          if (result?.error) {
            setError("Login failed. Please try again.");
            setStatus("ready");
            return;
          }

          router.push("/dashboard");
        } else if (data.status === "expired" || data.status === "not_found") {
          setToken(null);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Silently ignore poll errors
      }
    };

    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, status, router]);

  const expired = !token && status === "ready" && !error;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {status === "loading" && (
        <div className="w-48 h-48 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {status === "signing_in" && (
        <div className="w-48 h-48 flex flex-col items-center justify-center gap-2">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Signing you in...</p>
        </div>
      )}

      {qrUrl && token && status === "ready" && (
        <>
          <div className="bg-white p-3 rounded-lg">
            <QRCodeSVG value={qrUrl} size={192} />
          </div>

          {shortCode && (
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Or enter this code manually:
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-gray-900 dark:text-white">
                {shortCode}
              </p>
            </div>
          )}

          {secondsLeft > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[250px]">
            Scan this QR code with a device where you&apos;re already logged in to Excalisave
          </p>
        </>
      )}

      {expired && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">QR code expired</p>
          <button
            onClick={createToken}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Generate new code
          </button>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={createToken}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
