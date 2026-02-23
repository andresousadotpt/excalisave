"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useMasterKey } from "@/hooks/useMasterKey";
import {
  decryptMasterKey,
  encryptMasterKey,
  generateMasterKey,
} from "@/lib/crypto";
import { SetPinDialog } from "@/components/SetPinDialog";

export default function AccountPage() {
  const { data: session, update } = useSession();
  const { masterKey, setMasterKey, clearMasterKey } = useMasterKey();
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [removingPin, setRemovingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState("");

  const hasPinConfigured = !!(session?.user?.encryptedMasterKeyPin);

  async function handleRemovePin() {
    if (!confirm("Are you sure you want to remove your PIN? You'll need to use your password to unlock.")) return;
    setRemovingPin(true);
    setPinMessage("");
    try {
      const res = await fetch("/api/auth/pin", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove PIN");
      }
      await update();
      setPinMessage("PIN removed successfully");
    } catch (err) {
      setPinMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRemovingPin(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/auth/account");
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `excalisave-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      let keyMaterial: Record<string, string> = {};
      const hasKeyMaterial =
        session?.user?.encryptedMasterKey &&
        session?.user?.masterKeySalt &&
        session?.user?.masterKeyIv;

      if (hasKeyMaterial) {
        // Decrypt master key (use in-memory if available, otherwise decrypt from session)
        let key = masterKey;
        if (!key) {
          key = await decryptMasterKey(
            session.user.encryptedMasterKey,
            session.user.masterKeySalt,
            session.user.masterKeyIv,
            currentPassword
          );
        }
        // Re-encrypt master key with new password
        const encrypted = await encryptMasterKey(key, newPassword);
        keyMaterial = {
          encryptedMasterKey: encrypted.encryptedKey,
          masterKeySalt: encrypted.salt,
          masterKeyIv: encrypted.iv,
        };
        setMasterKey(key);
      } else {
        // No master key yet — generate one
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

      // Re-login to get a fresh JWT with updated key material
      await signIn("credentials", {
        email: session?.user?.email,
        password: newPassword,
        redirect: false,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password changed successfully");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      clearMasterKey();
      await signOut({ redirectTo: "/login" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>

      {/* Account Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">Email:</span>{" "}
            {session?.user?.email}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">Role:</span>{" "}
            {session?.user?.role}
          </p>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Change Password</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Your encryption key will be re-wrapped with your new password. Your drawings remain encrypted with the same master key.
        </p>
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
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
          {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600 dark:text-green-400 text-sm">{passwordSuccess}</p>}
          <button
            type="submit"
            disabled={passwordLoading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {passwordLoading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* PIN Management */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick Unlock PIN</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {hasPinConfigured
            ? "Your PIN is configured. You can change or remove it."
            : "Set an 8-character alphanumeric PIN for faster vault unlocking instead of entering your password."}
        </p>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${hasPinConfigured ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
            {hasPinConfigured ? "PIN configured" : "No PIN set"}
          </span>
          <button
            onClick={() => { setPinMessage(""); setShowPinDialog(true); }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {hasPinConfigured ? "Change PIN" : "Set PIN"}
          </button>
          {hasPinConfigured && (
            <button
              onClick={handleRemovePin}
              disabled={removingPin}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
            >
              {removingPin ? "Removing..." : "Remove PIN"}
            </button>
          )}
        </div>
        {pinMessage && (
          <p className={`text-sm mt-2 ${pinMessage.includes("success") ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {pinMessage}
          </p>
        )}
      </div>

      {showPinDialog && masterKey && (
        <SetPinDialog
          masterKey={masterKey}
          onClose={() => {
            setShowPinDialog(false);
            update();
          }}
        />
      )}

      {/* Data Export (GDPR) */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Export Your Data</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download all your account data including encrypted drawings. This is your right under GDPR
          (Article 20 — Right to data portability).
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {exporting ? "Exporting..." : "Download Data Export"}
        </button>
      </div>

      {/* Delete Account (GDPR Right to Erasure) */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Delete Account</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
          All your drawings will be permanently erased. This is your right under GDPR
          (Article 17 — Right to erasure).
        </p>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            Delete My Account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3 max-w-sm">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Enter your password to confirm account deletion:
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              required
              className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
            />
            {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleteLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
