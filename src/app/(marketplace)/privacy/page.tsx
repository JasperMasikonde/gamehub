import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Eshabiki Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
      <p className="text-text-muted text-sm mb-10">Last updated: April 2025</p>

      <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">1. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-text-primary">Account data:</strong> name, email address, and password (hashed).</li>
            <li><strong className="text-text-primary">Transaction data:</strong> purchase history, listing data, and encrypted account credentials you upload as a seller.</li>
            <li><strong className="text-text-primary">Payment data:</strong> M-Pesa phone number and transaction reference numbers. We do not store full M-Pesa PINs or card numbers.</li>
            <li><strong className="text-text-primary">Usage data:</strong> IP address, browser type, and pages visited, collected via server logs.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To operate and provide the marketplace service.</li>
            <li>To process M-Pesa payments and manage escrow.</li>
            <li>To send transactional notifications (order confirmations, dispute updates).</li>
            <li>To detect fraud and enforce our Terms of Service.</li>
            <li>To improve the Platform through aggregated, anonymised analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">3. Credential Encryption</h2>
          <p>
            Account credentials (usernames and passwords) uploaded by sellers are encrypted at rest
            using AES-256-GCM encryption. The encryption key is never stored in the database.
            Decrypted credentials are only revealed to the verified buyer of a transaction once
            delivery has been confirmed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">4. Sharing of Information</h2>
          <p>
            We do not sell your personal data. We share information only:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>With NCBA Bank/M-Pesa as required to process payments.</li>
            <li>With Google Cloud Storage to store listing images.</li>
            <li>Where required by Kenyan law or a valid court order.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">5. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. Transaction records
            are retained for 7 years to comply with Kenyan financial regulations. You may request
            deletion of your account at any time by contacting support.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">6. Cookies</h2>
          <p>
            We use a single session cookie (JWT) to keep you logged in. We do not use third-party
            advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">7. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. Email us at{" "}
            <a href="mailto:support@eshabiki.com" className="text-neon-green hover:underline">
              support@eshabiki.com
            </a>{" "}
            to make a request. We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">8. Security</h2>
          <p>
            We use industry-standard security practices including HTTPS, encrypted credentials,
            bcrypt password hashing, and rate limiting. No system is completely secure — if you
            believe your account has been compromised, contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">9. Changes</h2>
          <p>
            We may update this Privacy Policy. We will notify registered users of material changes
            via email. Continued use of the Platform constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">10. Contact</h2>
          <p>
            Privacy concerns?{" "}
            <a href="mailto:support@eshabiki.com" className="text-neon-green hover:underline">
              support@eshabiki.com
            </a>
          </p>
        </section>

      </div>
    </main>
  );
}
