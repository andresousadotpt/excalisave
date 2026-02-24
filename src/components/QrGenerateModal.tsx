"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QrGenerateModalProps {
  onClose: () => void;
}

export function QrGenerateModal({ onClose }: QrGenerateModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "consumed">(
    "loading"
  );
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
      const remaining = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000)
      );
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

  // Poll for consumption
  useEffect(() => {
    if (!token || status !== "ready") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/auth/qr/status?token=${token}`);
        const data = await res.json();

        if (data.status === "consumed") {
          setStatus("consumed");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (
          data.status === "expired" ||
          data.status === "not_found"
        ) {
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
  }, [token, status]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const expired = !token && status === "ready" && !error;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Login QR Code
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <div className="w-48 h-48 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}

          {status === "consumed" && (
            <div className="text-center py-4">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-green-600 dark:text-green-400 font-medium">
                Device logged in!
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Done
              </button>
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
                    Or enter this code on the login page:
                  </p>
                  <p className="font-mono text-2xl font-bold tracking-[0.3em] text-gray-900 dark:text-white">
                    {shortCode}
                  </p>
                </div>
              )}

              {secondsLeft > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expires in {Math.floor(secondsLeft / 60)}:
                  {String(secondsLeft % 60).padStart(2, "0")}
                </p>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[250px]">
                Scan this QR code or enter the code on the login page of another
                device
              </p>
            </>
          )}

          {expired && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                QR code expired
              </p>
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
      </div>
    </div>
  );
}
