import Link from "next/link";

export const metadata = {
  title: "Terms of Service - Excalisave",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mb-8 inline-block"
        >
          &larr; Back to home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: February 23, 2026
        </p>

        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Excalisave (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service. If you do not agree,
              do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              2. Description of Service
            </h2>
            <p>
              Excalisave is a self-hosted drawing application built on
              Excalidraw with end-to-end encryption. Drawing data is encrypted
              in your browser before being sent to the server. The server never
              has access to your plaintext drawing data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              3. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials. You must provide a valid email address for
              account verification. You are responsible for all activity that
              occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              4. End-to-End Encryption
            </h2>
            <p>
              Your drawing data is encrypted using a master key derived from
              your password. If you lose your password, your encrypted data
              cannot be recovered. The Service operator cannot decrypt your
              drawing data under any circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              5. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>
                Attempt to gain unauthorized access to the Service or its
                systems
              </li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious content or attempt to exploit the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              6. Data and Content
            </h2>
            <p>
              You retain ownership of all content you create using the Service.
              Since your drawing data is end-to-end encrypted, only you can
              access its contents. The Service stores encrypted blobs and cannot
              view, modify, or share your drawings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              7. Service Availability
            </h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of
              any kind. We do not guarantee uninterrupted or error-free
              operation. We may modify, suspend, or discontinue the Service at
              any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              8. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, the Service operator shall
              not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of the Service,
              including but not limited to data loss due to forgotten passwords
              or encryption key loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              9. Account Termination
            </h2>
            <p>
              We may suspend or terminate your account if you violate these
              Terms. Upon termination, your encrypted data will be permanently
              deleted. You may request account deletion at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              10. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              11. Contact
            </h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:support+draw@andresousa.pt"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                support+draw@andresousa.pt
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
