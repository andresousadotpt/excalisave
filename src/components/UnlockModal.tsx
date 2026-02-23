"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { decryptMasterKey } from "@/lib/crypto";
import { useMasterKey } from "@/hooks/useMasterKey";

export function UnlockModal() {
  const { data: session } = useSession();
  const { isUnlocked, setMasterKey } = useMasterKey();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session || isUnlocked) return null;

  async function handleUnlock(e: React.FormEvent) {
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
    } catch {
      setError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">
          Unlock your vault
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your password to decrypt your drawings.
        </p>
        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
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
        </form>
      </div>
    </div>
  );
}
