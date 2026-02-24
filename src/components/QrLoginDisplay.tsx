"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function QrLoginDisplay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrToken = searchParams.get("qr");

  const [tab, setTab] = useState<"scan" | "code">("scan");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState<"idle" | "consuming" | "signing_in">(
    qrToken ? "consuming" : "idle"
  );
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

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

  // Initialize camera scanner
  useEffect(() => {
    if (tab !== "scan" || qrToken) return;

    let cancelled = false;

    async function startScanner() {
      // Request camera permission explicitly first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        // Stop the test stream immediately — Html5Qrcode will open its own
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        if (!cancelled) {
          const name = err instanceof Error ? err.name : "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            setCameraError(
              "Camera permission denied. Please allow camera access in your browser settings and reload."
            );
          } else {
            setCameraError(
              "Unable to access camera. Try entering the code manually."
            );
          }
        }
        return;
      }

      if (cancelled) return;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const container = document.getElementById("qr-login-scanner");
        if (!container || cancelled) return;

        const scanner = new Html5Qrcode("qr-login-scanner");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            try {
              const parsed = new URL(decodedText);
              if (parsed.origin !== window.location.origin) return;
              const token = parsed.searchParams.get("qr");
              if (token) {
                scanner.stop().catch(() => {});
                consumeAndSignIn({ token });
              }
            } catch {
              // Not a valid URL, ignore
            }
          },
          () => {}
        );
      } catch {
        if (!cancelled) {
          setCameraError(
            "Unable to start camera scanner. Try entering the code manually."
          );
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        try {
          scanner.stop().catch(() => {});
        } catch {
          // Ignore synchronous errors from stop()
        }
      }
    };
  }, [tab, qrToken, consumeAndSignIn]);

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
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setTab("scan");
            setError("");
            setCameraError("");
          }}
          className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "scan"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Scan QR
        </button>
        <button
          onClick={() => {
            setTab("code");
            setError("");
          }}
          className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "code"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Enter Code
        </button>
      </div>

      {/* Always keep scanner container in DOM so Html5Qrcode can clean up properly */}
      <div style={{ display: tab === "scan" ? "block" : "none" }}>
        {cameraError ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {cameraError}
            </p>
            <button
              onClick={() => setTab("code")}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Enter code instead
            </button>
          </div>
        ) : (
          <>
            <div
              id="qr-login-scanner"
              className="w-full aspect-square rounded-lg overflow-hidden bg-black"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              Point your camera at the QR code on your logged-in device
            </p>
          </>
        )}
      </div>

      <div style={{ display: tab === "code" ? "block" : "none" }}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-character code shown on your logged-in device:
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
      </div>
    </div>
  );
}
