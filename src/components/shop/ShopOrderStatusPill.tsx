import { ShopOrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

const config: Record<ShopOrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  PAID:            { label: "Paid",            className: "bg-neon-blue/10 text-neon-blue border-neon-blue/20" },
  PROCESSING:      { label: "Processing",      className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  SHIPPED:         { label: "Shipped",         className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  DELIVERED:       { label: "Delivered",       className: "bg-neon-green/10 text-neon-green border-neon-green/20" },
  CANCELLED:       { label: "Cancelled",       className: "bg-neon-red/10 text-neon-red border-neon-red/20" },
  REFUNDED:        { label: "Refunded",        className: "bg-text-muted/10 text-text-muted border-bg-border" },
};

export function ShopOrderStatusPill({ status }: { status: ShopOrderStatus }) {
  const { label, className } = config[status];
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", className)}>
      {label}
    </span>
  );
}
