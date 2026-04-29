"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, Wallet, CreditCard } from "lucide-react";
import { PaymentPanel } from "@/components/payments/PaymentPanel";
import { WalletPayButton } from "@/components/wallet/WalletPayButton";
import { formatCurrency, formatChallengeFormat } from "@/lib/utils/format";

export function HostPaymentBanner({
  challengeId,
  wagerAmount,
  format,
}: {
  challengeId: string;
  wagerAmount: string;
  format: string;
}) {
  const router = useRouter();
  const [payMethod, setPayMethod] = useState<"wallet" | "mpesa">("wallet");
  const formatLabel = formatChallengeFormat(format);

  return (
    <div className="border border-neon-yellow/30 bg-neon-yellow/5 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-neon-yellow flex items-center gap-2">
          <Swords size={14} />
          Pay your wager to list this challenge
        </p>
        <p className="text-xs text-text-muted mt-1">
          {formatLabel} · Wager: <span className="text-neon-green font-semibold">{formatCurrency(wagerAmount)}</span>
        </p>
        <p className="text-xs text-text-muted mt-1">
          Your challenge won&apos;t be visible to other players until you pay.
        </p>
      </div>

      {/* Payment method tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setPayMethod("wallet")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            payMethod === "wallet"
              ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
              : "border-border text-text-muted hover:text-text-primary"
          }`}
        >
          <Wallet size={12} /> Wallet
        </button>
        <button
          onClick={() => setPayMethod("mpesa")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            payMethod === "mpesa"
              ? "border-neon-green bg-neon-green/10 text-neon-green"
              : "border-border text-text-muted hover:text-text-primary"
          }`}
        >
          <CreditCard size={12} /> M-Pesa
        </button>
      </div>

      {payMethod === "wallet" ? (
        <WalletPayButton
          challengeId={challengeId}
          wagerAmount={Number(wagerAmount)}
          role="host"
          onSuccess={() => router.refresh()}
        />
      ) : (
        <PaymentPanel
          purpose="challenge_host"
          entityId={challengeId}
          amount={Number(wagerAmount)}
          onSuccess={() => router.refresh()}
          returnUrl={`/challenges/${challengeId}`}
          returnLabel="Back to challenge"
          hideQrSection
        />
      )}
    </div>
  );
}
