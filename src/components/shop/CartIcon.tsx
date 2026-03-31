"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function CartIcon() {
  const { data: session } = useSession();
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!session?.user) { setCount(0); return; }
    fetch("/api/shop/cart")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.cart) {
          setCount(data.cart.items?.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) ?? 0);
        }
      })
      .catch(() => {});
  }, [pathname, session?.user]);

  if (!session?.user) return null;

  return (
    <Link href="/shop/cart" className="relative text-text-muted hover:text-text-primary transition-colors">
      <ShoppingCart size={20} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold bg-neon-green text-bg-base rounded-full w-4 h-4 flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
