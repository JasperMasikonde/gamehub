"use client";

import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PaymentPanel } from "@/components/payments/PaymentPanel";

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-neon-blue" />
          <h2 className="font-semibold text-sm">Complete Payment</h2>
        </div>
      </CardHeader>
      <CardContent>
        <PaymentPanel
          purpose="escrow"
          entityId={transactionId}
          amount={Number(amount)}
          currency={currency}
          onSuccess={() => router.refresh()}
        />
      </CardContent>
    </Card>
  );
}
