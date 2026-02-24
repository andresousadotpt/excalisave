"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateMasterKey, encryptMasterKey, decryptMasterKey } from "@/lib/crypto";
import { useMasterKey } from "@/hooks/useMasterKey";
import { QrLoginDisplay } from "@/components/QrLoginDisplay";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMasterKey } = useMasterKey();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(
    searchParams.get("verified") === "true"
      ? "Email verified! You can now sign in."
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [authTab, setAuthTab] = useState<"credentials" | "qr">("credentials");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "register") {
        // Generate and encrypt master key
        const masterKey = await generateMasterKey();
        const encrypted = await encryptMasterKey(masterKey, password);

        // Register with server
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            encryptedMasterKey: encrypted.encryptedKey,
            masterKeySalt: encrypted.salt,
            masterKeyIv: encrypted.iv,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Registration failed");
        }

        // Show success message - user needs to verify email
        setSuccess("Account created! Check your email to verify your account.");
        setEmail("");
        setPassword("");
      } else {
        // Login
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          const code = result.code || result.error;
          if (code === "email_not_verified") {
            throw new Error("Please verify your email before signing in.");
          }
          if (code === "account_banned") {
            throw new Error("Your account has been suspended.");
          }
          if (code === "account_not_setup") {
            throw new Error("Please check your email for the invite link to set your password.");
          }
          throw new Error("Invalid email or password");
        }

        // Fetch session to get encrypted key material
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        // Handle must-change-password (admin first login)
        if (session.user.mustChangePassword) {
          router.push("/change-password");
          return;
        }

        // Decrypt master key if key material exists
        if (session.user.encryptedMasterKey && session.user.masterKeySalt && session.user.masterKeyIv) {
          const masterKey = await decryptMasterKey(
            session.user.encryptedMasterKey,
            session.user.masterKeySalt,
            session.user.masterKeyIv,
            password
          );
          setMasterKey(masterKey);
        }

        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {mode === "login" && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setAuthTab("credentials")}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              authTab === "credentials"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Email & Password
          </button>
          <button
            onClick={() => setAuthTab("qr")}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              authTab === "qr"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            QR Code
          </button>
        </div>
      )}

      {mode === "login" && authTab === "qr" ? (
        <QrLoginDisplay />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Min 8 characters"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
