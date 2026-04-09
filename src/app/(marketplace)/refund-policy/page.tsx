import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Eshabiki Refund Policy — when and how refunds are issued.",
};

export default function RefundPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Refund Policy</h1>
      <p className="text-text-muted text-sm mb-10">Last updated: April 2025</p>

      <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">How Escrow Works</h2>
          <p>
            Every account sale on Eshabiki is protected by escrow. When you pay, funds are held
            by Eshabiki and not released to the seller until you confirm that you have received
            the account credentials and they match the listing description.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">Automatic Refund Situations</h2>
          <p>You are entitled to a full refund if:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The seller fails to deliver credentials within the agreed delivery window.</li>
            <li>The delivered credentials do not match the listing (e.g., wrong account level, missing coins).</li>
            <li>The account delivered has been previously compromised or is banned.</li>
            <li>You raise a dispute and the administrator rules in your favour.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">Non-Refundable Situations</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You have already confirmed delivery — confirmation is final and triggers fund release to the seller.</li>
            <li>You changed your mind after the seller has delivered valid credentials.</li>
            <li>The account was subsequently banned due to your own actions after delivery.</li>
            <li>Platform fees are non-refundable except where Eshabiki determines the seller was at fault.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">How to Request a Refund</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Go to your transaction in the dashboard.</li>
            <li>Click <strong className="text-text-primary">&quot;Open Dispute&quot;</strong> before the dispute window closes.</li>
            <li>Describe the issue clearly and attach any relevant screenshots.</li>
            <li>An Eshabiki administrator will review the dispute and issue a decision within 48 hours.</li>
            <li>If ruled in your favour, the refund will be sent to your M-Pesa number within 1–3 business days.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">Shop Orders</h2>
          <p>
            For physical or digital items purchased through the Eshabiki Shop:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Digital items (gift cards, in-game items): refunds are only available if the item was not delivered or is invalid.</li>
            <li>Physical items (peripherals, merchandise): you may request a return within 7 days of delivery if the item is defective or not as described. Return shipping costs are borne by the buyer unless the item was faulty.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">Refund Timeline</h2>
          <p>
            Approved refunds are processed within 1–3 business days via M-Pesa. Processing time
            depends on Safaricom&apos;s network and may occasionally take longer.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-3">Contact</h2>
          <p>
            Questions about a refund?{" "}
            <a href="mailto:support@eshabiki.com" className="text-neon-green hover:underline">
              support@eshabiki.com
            </a>
          </p>
        </section>

      </div>
    </main>
  );
}
