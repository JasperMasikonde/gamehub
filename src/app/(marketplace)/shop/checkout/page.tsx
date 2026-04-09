export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: { select: { name: true, price: true, currency: true, stock: true } } },
      },
    },
  });

  if (!cart || cart.items.length === 0) redirect("/shop/cart");

  const total = cart.items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
  const currency = cart.items[0]?.product.currency ?? "KES";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/shop/cart" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form — first on mobile, second column on desktop */}
        <div className="order-first md:order-last">
          <CheckoutForm total={total} currency={currency} />
        </div>

        {/* Order summary — second on mobile, first column on desktop */}
        <div className="order-last md:order-first bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-3 h-fit">
          <h2 className="font-semibold text-sm">Your Items</h2>
          {cart.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-text-muted truncate mr-2">{item.product.name} ×{item.quantity}</span>
              <span className="shrink-0 font-medium">{currency} {(Number(item.product.price) * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-bg-border pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-neon-green">{currency} {total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
