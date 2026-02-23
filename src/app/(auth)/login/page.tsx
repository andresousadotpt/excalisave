import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          Sign in to Excalisave
        </h1>
        <div className="flex justify-center">
          <Suspense>
            <AuthForm mode="login" />
          </Suspense>
        </div>
        <p className="text-center mt-4 text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
