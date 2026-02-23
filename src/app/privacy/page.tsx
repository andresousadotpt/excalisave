import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Excalisave",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: February 23, 2026
        </p>

        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              1. Overview
            </h2>
            <p>
              Excalisave is designed with privacy as a core principle. Your
              drawing data is end-to-end encrypted — it is encrypted in your
              browser before being transmitted to our servers, and only you hold
              the keys to decrypt it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              2. Data We Collect
            </h2>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">
              Account Information
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Email address</strong> — encrypted at rest using
                server-side AES-256-GCM encryption. A SHA-256 hash of your email
                is used for account lookups. Your plaintext email is never stored
                in the database.
              </li>
              <li>
                <strong>Password</strong> — hashed with bcrypt (12 rounds).
                Your plaintext password is never stored.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">
              Drawing Data
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Drawing content</strong> — end-to-end encrypted with
                AES-256-GCM using a key derived from your password. The server
                stores only encrypted blobs and cannot decrypt them.
              </li>
              <li>
                <strong>Drawing names</strong> — encrypted at rest using
                server-side encryption.
              </li>
              <li>
                <strong>Thumbnails</strong> — optional preview images stored
                alongside your drawings.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">
              Encryption Keys
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                A 256-bit master encryption key is generated in your browser
                during registration.
              </li>
              <li>
                This key is encrypted with a key derived from your password
                (PBKDF2, SHA-256, 600,000 iterations) before being stored on the
                server.
              </li>
              <li>
                The server never has access to your unencrypted master key.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              3. How We Use Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and maintain the Service</li>
              <li>To authenticate your identity</li>
              <li>To send account verification emails</li>
              <li>To store your encrypted drawings for retrieval</li>
            </ul>
            <p className="mt-2">
              We do not use your data for advertising, analytics profiling, or
              any purpose beyond operating the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              4. Data Sharing
            </h2>
            <p>
              We do not sell, rent, or share your personal data with third
              parties. Your encrypted drawing data is inaccessible to us and
              cannot be shared even if requested. The only third-party service
              used is Resend for transactional emails (account verification).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              5. Data Storage and Security
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                All data is stored in a PostgreSQL database on infrastructure
                controlled by the Service operator.
              </li>
              <li>
                Personal identifiable information (email, drawing names) is
                encrypted at rest using AES-256-GCM.
              </li>
              <li>
                Drawing content is end-to-end encrypted — only you can decrypt
                it.
              </li>
              <li>All connections use HTTPS/TLS encryption in transit.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              6. Data Retention
            </h2>
            <p>
              Your data is retained for as long as your account is active. Upon
              account deletion, all associated data (encrypted drawings,
              encrypted email, key material) is permanently deleted via cascade
              deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              7. Your Rights
            </h2>
            <p>Under GDPR and similar regulations, you have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Right of access</strong> — view your account information
              </li>
              <li>
                <strong>Right to data portability</strong> (Article 20) —
                export all your data via Account Settings
              </li>
              <li>
                <strong>Right to erasure</strong> (Article 17) — permanently
                delete your account and all associated data via Account Settings
              </li>
              <li>
                <strong>Right to rectification</strong> — change your password
                at any time
              </li>
            </ul>
            <p className="mt-2">
              All these actions are self-service and available in your{" "}
              <strong>Account Settings</strong> page. No request to an
              administrator is necessary.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              8. Cookies
            </h2>
            <p>
              The Service uses only essential session cookies for
              authentication. No tracking cookies, analytics cookies, or
              third-party cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              9. Password Loss
            </h2>
            <p>
              Due to the end-to-end encryption design, if you lose your
              password, your encrypted drawing data cannot be recovered. The
              Service operator does not have the ability to decrypt your data.
              Please keep your password safe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify users of significant changes. Continued use of the Service
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              11. Contact
            </h2>
            <p>
              For privacy-related questions or requests, contact us at{" "}
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
