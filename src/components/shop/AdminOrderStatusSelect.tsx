"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShopOrderStatus } from "@prisma/client";

const STATUSES: ShopOrderStatus[] = [
  "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED",
];

const labels: Record<ShopOrderStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function AdminOrderStatusSelect({ orderId, current }: { orderId: string; current: ShopOrderStatus }) {
  const [status, setStatus] = useState(current);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ShopOrderStatus;
    setStatus(newStatus);
    setLoading(true);
    await fetch(`/api/admin/shop/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={loading}
      className="text-sm bg-bg-elevated border border-bg-border rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-neon-blue/50 disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{labels[s]}</option>
      ))}
    </select>
  );
}
