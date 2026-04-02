"use client";

import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { PaymentPanel } from "@/components/payments/PaymentPanel";
import { formatCurrency } from "@/lib/utils/format";

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
  const formatLabel = format === "BEST_OF_3" ? "Best of 3" : "Best of 5";

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
      <PaymentPanel
        purpose="challenge_host"
        entityId={challengeId}
        amount={Number(wagerAmount)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
