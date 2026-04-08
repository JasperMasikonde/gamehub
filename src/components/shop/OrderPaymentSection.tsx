"use client";

import { useRouter } from "next/navigation";
import { PaymentPanel } from "@/components/payments/PaymentPanel";

export function OrderPaymentSection({
  orderId,
  amount,
  currency,
}: {
  orderId: string;
  amount: number;
  currency: string;
}) {
  const router = useRouter();
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-sm">Pay for your order</h3>
      <PaymentPanel
        purpose="shop"
        entityId={orderId}
        amount={amount}
        currency={currency}
        onSuccess={() => router.push(`/shop/orders/${orderId}?success=1`)}
      />
    </div>
  );
}
