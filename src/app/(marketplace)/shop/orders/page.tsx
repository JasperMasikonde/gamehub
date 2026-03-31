export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ShopOrderStatusPill } from "@/components/shop/ShopOrderStatusPill";
import Link from "next/link";
import { Package } from "lucide-react";

export default async function MyOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.shopOrder.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Package size={22} className="text-neon-blue" />
        <h1 className="text-2xl font-bold">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Package size={48} className="mx-auto text-text-muted opacity-20" />
          <p className="text-text-muted">No orders yet.</p>
          <Link href="/shop" className="text-neon-blue text-sm hover:underline">Visit the shop</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/shop/orders/${order.id}`}
              className="flex items-center justify-between p-5 bg-bg-surface border border-bg-border rounded-2xl hover:border-neon-blue/30 transition-colors"
            >
              <div>
                <p className="font-mono text-xs text-text-muted mb-1">{order.id.slice(0, 12)}…</p>
                <p className="text-sm font-medium">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-text-muted mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-lg font-bold text-neon-green">KES {Number(order.total).toLocaleString()}</p>
                <ShopOrderStatusPill status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
