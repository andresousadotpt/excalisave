import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  const registrationEnabled = process.env.REGISTRATION_ENABLED !== "false";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          Create your account
        </h1>

        {registrationEnabled ? (
          <>
            <div className="flex justify-center">
              <AuthForm mode="register" />
            </div>
            <p className="text-center mt-4 text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Registration is currently closed.
            </p>
            <p className="text-sm text-gray-500">
              To request access, please email{" "}
              <a
                href="mailto:support+draw@andresousa.pt"
                className="text-blue-600 hover:underline"
              >
                support+draw@andresousa.pt
              </a>
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 text-sm text-blue-600 hover:underline"
            >
              Already have an account? Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
