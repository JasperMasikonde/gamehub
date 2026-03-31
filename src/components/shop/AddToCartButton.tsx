"use client";

import { useState } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface AddToCartButtonProps {
  productId: string;
  inStock: boolean;
  className?: string;
}

export function AddToCartButton({ productId, inStock, className }: AddToCartButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");
  const router = useRouter();

  async function handleAdd() {
    if (!inStock || state !== "idle") return;
    setState("loading");
    try {
      const res = await fetch("/api/shop/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error();
      setState("added");
      window.dispatchEvent(new CustomEvent("cart:updated"));
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }

  return (
    <Button
      variant="primary"
      className={className}
      onClick={handleAdd}
      disabled={!inStock || state !== "idle"}
    >
      {state === "loading" ? (
        <><Loader2 size={16} className="animate-spin" /> Adding…</>
      ) : state === "added" ? (
        <><Check size={16} /> Added!</>
      ) : (
        <><ShoppingCart size={16} /> {inStock ? "Add to Cart" : "Out of Stock"}</>
      )}
    </Button>
  );
}
