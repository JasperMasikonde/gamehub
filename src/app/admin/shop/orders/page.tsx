export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ShopOrderStatusPill } from "@/components/shop/ShopOrderStatusPill";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await prisma.shopOrder.findMany({
    include: {
      user: { select: { username: true, displayName: true, email: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop Orders</h1>
        <p className="text-text-muted text-sm mt-1">{orders.length} total</p>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                <th className="text-left p-4 text-text-muted font-medium">Order ID</th>
                <th className="text-left p-4 text-text-muted font-medium">Customer</th>
                <th className="text-left p-4 text-text-muted font-medium">Items</th>
                <th className="text-left p-4 text-text-muted font-medium">Total</th>
                <th className="text-left p-4 text-text-muted font-medium">Status</th>
                <th className="text-left p-4 text-text-muted font-medium">Date</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {orders.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-text-muted">No orders yet.</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-bg-elevated transition-colors">
                  <td className="p-4 font-mono text-xs text-text-muted">{o.id.slice(0, 8)}…</td>
                  <td className="p-4">
                    <p className="font-medium">{o.user.displayName ?? o.user.username}</p>
                    <p className="text-xs text-text-muted">{o.user.email}</p>
                  </td>
                  <td className="p-4 text-text-muted">{o.items.length}</td>
                  <td className="p-4 font-bold text-neon-green">KES {Number(o.total).toLocaleString()}</td>
                  <td className="p-4"><ShopOrderStatusPill status={o.status} /></td>
                  <td className="p-4 text-text-muted text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <Link href={`/admin/shop/orders/${o.id}`} className="text-xs text-neon-blue hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
