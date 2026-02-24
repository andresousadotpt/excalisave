"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ApproveLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "confirm" | "approving" | "success" | "error"
  >("loading");
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError("Missing login token. Please scan the QR code again.");
      setStatus("error");
      return;
    }
    setStatus("confirm");
  }, [token]);

  async function handleApprove() {
    setStatus("approving");
    setError("");
    try {
      const res = await fetch("/api/auth/qr/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve login");
      setDeviceInfo(data.deviceInfo);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="bg-white dark:bg-gray-900 p-5 sm:p-8 rounded-xl shadow-md w-full max-w-sm text-center">
        {status === "loading" && (
          <div className="py-8 flex justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {status === "confirm" && (
          <>
            <div className="mb-4">
              <svg
                className="w-12 h-12 mx-auto text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Approve Login
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              A device is requesting to sign in to your account. Only approve
              this if you initiated the login.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Approve
              </button>
            </div>
          </>
        )}

        {status === "approving" && (
          <div className="py-8">
            <div className="animate-spin w-8 h-8 mx-auto mb-3 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Approving login...
            </p>
          </div>
        )}

        {status === "success" && (
          <>
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
            <p className="text-green-600 dark:text-green-400 font-medium mb-1">
              Login approved!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              The other device is now signing in.
            </p>
            {deviceInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Device: {deviceInfo}
              </p>
            )}
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Done
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <svg
              className="w-12 h-12 mx-auto mb-3 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ApproveLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ApproveLoginContent />
    </Suspense>
  );
}
