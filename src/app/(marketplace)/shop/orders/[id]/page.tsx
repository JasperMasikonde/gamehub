export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getPublicUrl } from "@/lib/gcs";
import { ShopOrderStatusPill } from "@/components/shop/ShopOrderStatusPill";
import Link from "next/link";
import { ArrowLeft, CheckCircle, MapPin } from "lucide-react";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { success } = await searchParams;

  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true, imageKeys: true, slug: true } } } },
    },
  });
  if (!order || order.userId !== session.user.id) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {success === "1" && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-neon-green/10 border border-neon-green/20 text-neon-green">
          <CheckCircle size={18} />
          <p className="text-sm font-medium">Order placed successfully! We&apos;ll be in touch soon.</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link href="/shop/orders" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Order Detail</h1>
            <ShopOrderStatusPill status={order.status} />
          </div>
          <p className="text-text-muted text-xs font-mono mt-0.5">{order.id}</p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-bg-border">
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
                  <Link href={`/shop/product/${item.product.slug}`} className="text-sm font-medium hover:text-neon-blue transition-colors">
                    {item.productName}
                  </Link>
                  <p className="text-xs text-text-muted mt-0.5">Qty: {item.quantity} × KES {Number(item.unitPrice).toLocaleString()}</p>
                </div>
                <p className="text-sm font-bold text-neon-green">KES {Number(item.subtotal).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between p-4 border-t border-bg-border bg-bg-elevated font-bold">
          <span>Total</span>
          <span className="text-neon-green">KES {Number(order.total).toLocaleString()}</span>
        </div>
      </div>

      {/* Shipping info */}
      {order.shippingName && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-neon-green" />
            <h2 className="font-semibold text-sm">Shipping Address</h2>
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

      <div className="flex justify-between text-xs text-text-muted">
        <span>Ordered {new Date(order.createdAt).toLocaleString()}</span>
        <Link href="/shop/orders" className="text-neon-blue hover:underline">View all orders</Link>
      </div>
    </div>
  );
}
