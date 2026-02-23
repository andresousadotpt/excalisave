"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMasterKey } from "@/hooks/useMasterKey";
import {
  generateMasterKey,
  decryptMasterKey,
  encryptMasterKey,
} from "@/lib/crypto";

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const { masterKey, setMasterKey } = useMasterKey();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      let keyMaterial: Record<string, string> = {};
      const hasKeyMaterial =
        session?.user?.encryptedMasterKey &&
        session?.user?.masterKeySalt &&
        session?.user?.masterKeyIv;

      if (hasKeyMaterial) {
        // Re-encrypt existing master key with new password
        let key = masterKey;
        if (!key) {
          key = await decryptMasterKey(
            session.user.encryptedMasterKey,
            session.user.masterKeySalt,
            session.user.masterKeyIv,
            currentPassword
          );
        }

        const encrypted = await encryptMasterKey(key, newPassword);
        keyMaterial = {
          encryptedMasterKey: encrypted.encryptedKey,
          masterKeySalt: encrypted.salt,
          masterKeyIv: encrypted.iv,
        };
        setMasterKey(key);
      } else {
        // No master key yet (e.g. admin first login) — generate one
        const key = await generateMasterKey();
        const encrypted = await encryptMasterKey(key, newPassword);
        keyMaterial = {
          encryptedMasterKey: encrypted.encryptedKey,
          masterKeySalt: encrypted.salt,
          masterKeyIv: encrypted.iv,
        };
        setMasterKey(key);
      }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          ...keyMaterial,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }

      // Re-login to get a fresh JWT with mustChangePassword: false
      const signInResult = await signIn("credentials", {
        email: session?.user?.email,
        password: newPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="bg-white dark:bg-gray-900 p-5 sm:p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Change Password
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          You must change your password before continuing.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
