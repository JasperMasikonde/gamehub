export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, MapPin } from "lucide-react";
import Link from "next/link";
import { ShopOrderStatusPill } from "@/components/shop/ShopOrderStatusPill";
import { AdminOrderStatusSelect } from "@/components/shop/AdminOrderStatusSelect";
import { getPublicUrl } from "@/lib/gcs";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, displayName: true, email: true } },
      items: { include: { product: { select: { name: true, imageKeys: true, slug: true } } } },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/shop/orders" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Order</h1>
            <ShopOrderStatusPill status={order.status} />
          </div>
          <p className="text-text-muted text-sm font-mono">{order.id}</p>
        </div>
        <AdminOrderStatusSelect orderId={order.id} current={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-bg-border">
              <Package size={15} className="text-neon-blue" />
              <h2 className="font-semibold text-sm">Items</h2>
            </div>
            <div className="divide-y divide-bg-border">
              {order.items.map((item) => {
                const imgUrl = item.product.imageKeys[0] ? getPublicUrl(item.product.imageKeys[0]) : null;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-lg bg-bg-elevated border border-bg-border overflow-hidden shrink-0">
                      {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-text-muted">Qty: {item.quantity} × KES {Number(item.unitPrice).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-bold text-neon-green">KES {Number(item.subtotal).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between p-4 border-t border-bg-border bg-bg-elevated">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold text-neon-green">KES {Number(order.total).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-bg-surface border border-bg-border rounded-2xl p-4 space-y-2">
            <h2 className="font-semibold text-sm mb-3">Customer</h2>
            <p className="text-sm font-medium">{order.user.displayName ?? order.user.username}</p>
            <p className="text-sm text-text-muted">{order.user.email}</p>
            <Link href={`/admin/messages/${order.user.id}`} className="text-xs text-neon-blue hover:underline block mt-2">Message customer</Link>
          </div>

          {/* Shipping */}
          {order.shippingName && (
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-neon-green" />
                <h2 className="font-semibold text-sm">Shipping</h2>
              </div>
              <p className="text-sm">{order.shippingName}</p>
              <p className="text-sm text-text-muted">{order.shippingLine1}</p>
              <p className="text-sm text-text-muted">{order.shippingCity}, {order.shippingPostal}</p>
              <p className="text-sm text-text-muted">{order.shippingCountry}</p>
              {order.trackingNumber && (
                <p className="text-xs text-neon-blue mt-2">Tracking: {order.trackingNumber}</p>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="bg-bg-surface border border-bg-border rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Placed</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Updated</span>
              <span>{new Date(order.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
