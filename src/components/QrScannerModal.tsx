"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface QrScannerModalProps {
  onClose: () => void;
}

export function QrScannerModal({ onClose }: QrScannerModalProps) {
  const [tab, setTab] = useState<"scan" | "code">("scan");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const extractTokenFromUrl = useCallback((url: string): string | null => {
    try {
      // Validate origin matches current app
      const parsed = new URL(url);
      if (parsed.origin !== window.location.origin) return null;
      return parsed.searchParams.get("token");
    } catch {
      return null;
    }
  }, []);

  const handleApprove = useCallback(async (token: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/qr/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setDeviceInfo(data.deviceInfo);
      setSuccess("Login approved!");
      setPendingToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApproveByCode = useCallback(async () => {
    if (shortCode.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/qr/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortCode: shortCode.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setDeviceInfo(data.deviceInfo);
      setSuccess("Login approved!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [shortCode]);

  // Initialize camera scanner
  useEffect(() => {
    if (tab !== "scan" || !scannerContainerRef.current) return;

    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode("qr-scanner-container");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const token = extractTokenFromUrl(decodedText);
            if (token) {
              setPendingToken(token);
              scanner.stop().catch(() => {});
            }
          },
          () => {} // Ignore scan failures
        );
      } catch {
        if (!cancelled) {
          setCameraError("Unable to access camera. Try entering the code manually.");
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [tab, extractTokenFromUrl]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Approve login
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-600 dark:text-green-400 font-medium">{success}</p>
            {deviceInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Device: {deviceInfo}
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Done
            </button>
          </div>
        ) : pendingToken ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Approve sign-in on another device?
            </p>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setPendingToken(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(pendingToken)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                onClick={() => { setTab("scan"); setError(""); setCameraError(""); }}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === "scan"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Scan QR
              </button>
              <button
                onClick={() => { setTab("code"); setError(""); }}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === "code"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Enter Code
              </button>
            </div>

            {tab === "scan" ? (
              <div>
                {cameraError ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{cameraError}</p>
                    <button
                      onClick={() => setTab("code")}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Enter code instead
                    </button>
                  </div>
                ) : (
                  <div
                    id="qr-scanner-container"
                    ref={scannerContainerRef}
                    className="w-full aspect-square rounded-lg overflow-hidden bg-black"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the 6-character code shown on the login screen:
                </p>
                <input
                  type="text"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-2xl text-center tracking-[0.3em]"
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  onClick={handleApproveByCode}
                  disabled={loading || shortCode.length !== 6}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Approving..." : "Approve Login"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
