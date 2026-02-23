import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Suspense } from "react";

export default function LoginPage() {
  const registrationEnabled = process.env.REGISTRATION_ENABLED !== "false";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Sign in to Excalisave
        </h1>
        <div className="flex justify-center">
          <Suspense>
            <AuthForm mode="login" />
          </Suspense>
        </div>
        {registrationEnabled ? (
          <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
              Register
            </Link>
          </p>
        ) : (
          <p className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account? Email{" "}
            <a
              href="mailto:support+draw@andresousa.pt"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              support+draw@andresousa.pt
            </a>{" "}
            to request access.
          </p>
        )}
      </div>
    </div>
  );
}
