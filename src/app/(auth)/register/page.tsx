import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  const registrationEnabled = process.env.REGISTRATION_ENABLED !== "false";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Create your account
        </h1>

        {registrationEnabled ? (
          <>
            <div className="flex justify-center">
              <Suspense>
                <AuthForm mode="register" />
              </Suspense>
            </div>
            <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Registration is currently closed.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              To request access, please email{" "}
              <a
                href="mailto:support+draw@andresousa.pt"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                support+draw@andresousa.pt
              </a>
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Already have an account? Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
