"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { encryptMasterKeyWithPin } from "@/lib/crypto";
import { PasswordInput } from "@/components/PasswordInput";

interface SetPinDialogProps {
  masterKey: CryptoKey;
  onClose: () => void;
}

export function SetPinDialog({ masterKey, onClose }: SetPinDialogProps) {
  const { update } = useSession();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    if (!/^[a-zA-Z0-9]{8}$/.test(pin)) {
      setError("PIN must be exactly 8 alphanumeric characters.");
      return;
    }

    setLoading(true);
    try {
      const { encryptedKey, salt, iv } = await encryptMasterKeyWithPin(masterKey, pin);

      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedMasterKeyPin: encryptedKey,
          masterKeyPinSalt: salt,
          masterKeyPinIv: iv,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save PIN");
      }

      await update();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Set a PIN for quick unlock
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your vault locks every time you close the browser. A PIN lets you unlock it quickly without typing your full password each time.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <PasswordInput
              inputMode="text"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              placeholder="Enter 8-character PIN"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-widest text-center text-lg"
              autoFocus
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">{pin.length}/8 characters</p>
          </div>
          <div>
            <PasswordInput
              inputMode="text"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              placeholder="Confirm PIN"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-widest text-center text-lg"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">{confirmPin.length}/8 characters</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 8 || confirmPin.length !== 8}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Set PIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
