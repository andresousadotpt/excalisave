"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { decryptMasterKey, decryptMasterKeyWithPin } from "@/lib/crypto";
import { useMasterKey } from "@/hooks/useMasterKey";
import { SetPinDialog } from "@/components/SetPinDialog";

export function UnlockModal() {
  const { data: session } = useSession();
  const { isUnlocked, masterKey, setMasterKey } = useMasterKey();
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePin, setUsePin] = useState(true);
  const [showPinSetup, setShowPinSetup] = useState(false);

  const hasKeyMaterial =
    session?.user?.encryptedMasterKey &&
    session?.user?.masterKeySalt &&
    session?.user?.masterKeyIv;

  const hasPinMaterial =
    session?.user?.encryptedMasterKeyPin &&
    session?.user?.masterKeyPinSalt &&
    session?.user?.masterKeyPinIv;

  if (!session || isUnlocked || !hasKeyMaterial) {
    // Show PIN setup prompt after unlock if no PIN is set
    if (isUnlocked && masterKey && session && !hasPinMaterial && showPinSetup) {
      return <SetPinDialog masterKey={masterKey} onClose={() => setShowPinSetup(false)} />;
    }
    return null;
  }

  async function handleUnlockWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const key = await decryptMasterKey(
        session!.user.encryptedMasterKey,
        session!.user.masterKeySalt,
        session!.user.masterKeyIv,
        password
      );
      setMasterKey(key);
      if (!hasPinMaterial) {
        setShowPinSetup(true);
      }
    } catch {
      setError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlockWithPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const key = await decryptMasterKeyWithPin(
        session!.user.encryptedMasterKeyPin!,
        session!.user.masterKeyPinSalt!,
        session!.user.masterKeyPinIv!,
        pin
      );
      setMasterKey(key);
    } catch {
      setError("Incorrect PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const showPinMode = hasPinMaterial && usePin;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Unlock your vault
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {showPinMode
            ? "Enter your PIN to decrypt your drawings."
            : "Enter your password to decrypt your drawings."}
        </p>

        {showPinMode ? (
          <form onSubmit={handleUnlockWithPin} className="space-y-3">
            <input
              type="password"
              inputMode="text"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              placeholder="8-character PIN"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-widest text-center text-lg"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || pin.length !== 8}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Unlocking..." : "Unlock with PIN"}
            </button>
            <button
              type="button"
              onClick={() => { setUsePin(false); setError(""); setPin(""); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Use password instead
            </button>
          </form>
        ) : (
          <form onSubmit={handleUnlockWithPassword} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Unlocking..." : "Unlock"}
            </button>
            {hasPinMaterial && (
              <button
                type="button"
                onClick={() => { setUsePin(true); setError(""); setPassword(""); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Use PIN instead
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
