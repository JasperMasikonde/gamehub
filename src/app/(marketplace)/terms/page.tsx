import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Eshabiki Terms of Service — rules governing use of the platform.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Terms of Service</h1>
      <p className="text-text-muted text-sm mb-10">Last updated: April 2025</p>

      <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Eshabiki (&quot;the Platform&quot;), you agree to be bound by these Terms
            of Service. If you do not agree, do not use the Platform. These terms apply to all users,
            including buyers, sellers, and visitors.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">2. Description of Service</h2>
          <p>
            Eshabiki is an online marketplace that enables users in Kenya to buy and sell eFootball
            game accounts. We facilitate transactions through an escrow system and accept payments via
            M-Pesa. We are not a party to any transaction between buyers and sellers — we provide the
            platform infrastructure only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">3. Eligibility</h2>
          <p>
            You must be at least 18 years old to use the Platform. By registering, you confirm that
            you are legally permitted to enter into binding contracts under Kenyan law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">4. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials and for
            all activity that occurs under your account. You must provide accurate information at
            registration. Eshabiki reserves the right to suspend or terminate accounts that violate
            these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">5. Listings and Transactions</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Sellers must accurately represent the accounts they list. Misrepresentation is grounds for immediate suspension.</li>
            <li>All payments are held in escrow until the buyer confirms delivery of the purchased account credentials.</li>
            <li>Once a buyer confirms delivery, the transaction is final and funds are released to the seller.</li>
            <li>Sellers must deliver account credentials within the timeframe stated at listing creation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">6. Prohibited Activities</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Listing accounts that you do not own or have rights to sell.</li>
            <li>Attempting to complete transactions outside the Platform to avoid escrow.</li>
            <li>Creating multiple accounts to circumvent bans or restrictions.</li>
            <li>Any form of fraud, chargebacks, or payment manipulation.</li>
            <li>Harassment of other users.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">7. Disputes</h2>
          <p>
            Either party may raise a dispute within the dispute window after delivery is marked. Eshabiki
            administrators will review the evidence provided by both parties and issue a binding
            decision. Funds will be released to the buyer (refund) or seller (release) based on the
            outcome. Eshabiki&apos;s decision is final.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">8. Fees</h2>
          <p>
            Eshabiki charges a platform fee on completed transactions. The current fee schedule is
            displayed at listing creation. Fees are non-refundable except in cases where Eshabiki
            determines the seller was at fault.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">9. Limitation of Liability</h2>
          <p>
            Eshabiki is not liable for any indirect, incidental, or consequential damages arising from
            your use of the Platform. Our total liability for any claim shall not exceed the amount
            you paid in platform fees in the three months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">10. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Continued use of the Platform after changes are
            posted constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">11. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:support@eshabiki.com" className="text-neon-green hover:underline">
              support@eshabiki.com
            </a>
            .
          </p>
        </section>

      </div>
    </main>
  );
}
