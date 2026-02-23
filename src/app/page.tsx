import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Excalisave</h1>
        <p className="text-lg text-gray-600 mb-8">
          Self-hosted Excalidraw with end-to-end encryption. Your drawings are
          encrypted before they leave your browser — the server never sees your
          data.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
