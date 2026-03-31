"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/format";

export function SimulatePaymentPanel({
  transactionId,
  amount,
  currency,
}: {
  transactionId: string;
  amount: string;
  currency: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_payment" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-neon-blue" />
          <h2 className="font-semibold text-sm">Complete Payment</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-neon-blue/5 border border-neon-blue/20 rounded-xl p-4 mb-4">
          <p className="text-xs text-text-muted mb-1">Amount to pay into escrow</p>
          <p className="text-3xl font-black text-neon-blue">
            {formatCurrency(amount, currency)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Held securely until you confirm the account.
          </p>
        </div>

        <div className="flex gap-2 items-start mb-4 p-3 rounded-lg bg-neon-green/5 border border-neon-green/20">
          <ShieldCheck size={14} className="text-neon-green shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted leading-relaxed">
            <span className="text-neon-green font-semibold">Dev mode — simulated payment.</span>{" "}
            Real M-Pesa / card payment will be integrated in production.
            Clicking below simulates a confirmed payment and releases the funds into escrow.
          </p>
        </div>

        {error && (
          <p className="text-sm text-neon-red bg-neon-red/5 border border-neon-red/20 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <Button variant="primary" className="w-full glow-green" onClick={pay} disabled={loading}>
          {loading ? (
            <><Loader2 size={15} className="animate-spin" /> Processing…</>
          ) : (
            <><CreditCard size={15} /> Pay {formatCurrency(amount, currency)} into Escrow</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
