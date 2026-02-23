"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateMasterKey, encryptMasterKey, decryptMasterKey } from "@/lib/crypto";
import { useMasterKey } from "@/hooks/useMasterKey";

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
          // NextAuth wraps the authorize() error message
          if (result.error.includes("verify")) {
            throw new Error("Please verify your email before signing in");
          }
          throw new Error("Invalid email or password");
        }

        // Fetch session to get encrypted key material
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        // Handle admin or must-change-password
        if (session.user.mustChangePassword) {
          router.push("/change-password");
          return;
        }

        if (session.user.role === "admin") {
          router.push("/admin");
          return;
        }

        // Decrypt master key for regular users
        const masterKey = await decryptMasterKey(
          session.user.encryptedMasterKey,
          session.user.masterKeySalt,
          session.user.masterKeyIv,
          password
        );

        setMasterKey(masterKey);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          placeholder="Min 8 characters"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
      </button>
    </form>
  );
}
