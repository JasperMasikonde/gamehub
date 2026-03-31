export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Package, Tag, ShoppingBag, TrendingUp } from "lucide-react";

export default async function AdminShopOverviewPage() {
  await requireAdmin();

  const [productCount, categoryCount, orderCount, recentOrders] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.productCategory.count({ where: { isActive: true } }),
    prisma.shopOrder.count(),
    prisma.shopOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, displayName: true, email: true } }, items: true },
    }),
  ]);

  const cards = [
    { label: "Active Products", value: productCount, icon: Package, href: "/admin/shop/products", color: "neon-blue" },
    { label: "Categories", value: categoryCount, icon: Tag, href: "/admin/shop/categories", color: "neon-green" },
    { label: "Total Orders", value: orderCount, icon: ShoppingBag, href: "/admin/shop/orders", color: "purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop Overview</h1>
        <p className="text-text-muted text-sm mt-1">Manage your gamer store</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={href} href={href} className="bg-bg-surface border border-bg-border rounded-2xl p-5 hover:border-neon-blue/30 transition-colors group">
            <div className={`w-10 h-10 rounded-xl bg-${color}/10 border border-${color}/20 flex items-center justify-center mb-3`}>
              <Icon size={18} className={`text-${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-text-muted text-sm">{label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-neon-green" />
            <h2 className="font-semibold text-sm">Recent Orders</h2>
          </div>
          <Link href="/admin/shop/orders" className="text-xs text-neon-blue hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-bg-border">
          {recentOrders.length === 0 && (
            <p className="text-text-muted text-sm p-5 text-center">No orders yet.</p>
          )}
          {recentOrders.map((order) => (
            <Link key={order.id} href={`/admin/shop/orders/${order.id}`} className="flex items-center justify-between p-4 hover:bg-bg-elevated transition-colors">
              <div>
                <p className="text-sm font-medium">{order.user.displayName ?? order.user.username}</p>
                <p className="text-xs text-text-muted">{order.items.length} item{order.items.length !== 1 ? "s" : ""} · {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-neon-green">KES {Number(order.total).toLocaleString()}</p>
                <p className="text-xs text-text-muted">{order.status}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
