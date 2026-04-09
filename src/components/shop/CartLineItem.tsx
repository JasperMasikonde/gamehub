"use client";

import { useState } from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface CartLineItemProps {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  currency?: string;
  slug: string;
}

export function CartLineItem({ itemId, name, price, quantity, imageUrl, currency = "KES", slug }: CartLineItemProps) {
  const [qty, setQty] = useState(quantity);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updateQty(newQty: number) {
    if (newQty < 1 || loading) return;
    setLoading(true);
    setQty(newQty);
    await fetch(`/api/shop/cart/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
    setLoading(false);
    router.refresh();
  }

  async function remove() {
    setLoading(true);
    await fetch(`/api/shop/cart/${itemId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-bg-surface border border-bg-border rounded-xl">
      <a href={`/shop/product/${slug}`} className="shrink-0">
        <div className="w-16 h-16 rounded-lg bg-bg-elevated overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">No img</div>
          )}
        </div>
      </a>

      <div className="flex-1 min-w-0">
        <a href={`/shop/product/${slug}`} className="text-sm font-medium text-text-primary hover:text-neon-blue transition-colors line-clamp-1">
          {name}
        </a>
        <p className="text-sm text-neon-green font-bold mt-0.5">
          {currency} {(price * qty).toLocaleString()}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => updateQty(qty - 1)}
          disabled={loading || qty <= 1}
          className="w-10 h-10 rounded-lg border border-bg-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-bg-elevated disabled:opacity-40 transition-colors"
        >
          <Minus size={15} />
        </button>
        <span className="text-sm font-semibold w-6 text-center">{qty}</span>
        <button
          onClick={() => updateQty(qty + 1)}
          disabled={loading}
          className="w-10 h-10 rounded-lg border border-bg-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-bg-elevated disabled:opacity-40 transition-colors"
        >
          <Plus size={15} />
        </button>
        <button
          onClick={remove}
          disabled={loading}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-neon-red transition-colors ml-1 disabled:opacity-40"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
