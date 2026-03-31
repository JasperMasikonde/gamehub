export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/gcs";
import { redirect } from "next/navigation";
import { CartLineItem } from "@/components/shop/CartLineItem";
import Link from "next/link";
import { ShoppingBag, ArrowRight, ShoppingCart } from "lucide-react";

export default async function CartPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, slug: true, price: true, currency: true, imageKeys: true, stock: true } } },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  const items = cart?.items ?? [];
  const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
  const currency = items[0]?.product.currency ?? "KES";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <ShoppingCart size={22} className="text-neon-blue" />
        <h1 className="text-2xl font-bold">My Cart</h1>
        {items.length > 0 && <span className="text-text-muted text-sm">({items.length} item{items.length !== 1 ? "s" : ""})</span>}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <ShoppingBag size={48} className="mx-auto text-text-muted opacity-20" />
          <p className="text-text-muted">Your cart is empty.</p>
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-neon-blue hover:underline">
            Browse the shop <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <CartLineItem
                key={item.id}
                itemId={item.id}
                name={item.product.name}
                price={Number(item.product.price)}
                quantity={item.quantity}
                currency={item.product.currency}
                slug={item.product.slug}
                imageUrl={item.product.imageKeys[0] ? getPublicUrl(item.product.imageKeys[0]) : undefined}
              />
            ))}
          </div>

          <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 h-fit space-y-4">
            <h2 className="font-semibold">Order Summary</h2>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-text-muted">
                  <span className="truncate mr-2">{item.product.name} ×{item.quantity}</span>
                  <span className="shrink-0">{currency} {(Number(item.product.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-bg-border pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-neon-green">{currency} {total.toLocaleString()}</span>
            </div>
            <Link
              href="/shop/checkout"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neon-blue text-bg-base font-semibold text-sm hover:bg-neon-blue/90 transition-colors"
            >
              Checkout <ArrowRight size={15} />
            </Link>
            <Link href="/shop" className="block text-center text-xs text-text-muted hover:text-text-primary transition-colors">
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
