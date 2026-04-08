"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, Package } from "lucide-react";

interface CheckoutFormProps {
  total: number;
  currency: string;
}

export function CheckoutForm({ total, currency }: CheckoutFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    shippingName: "",
    shippingLine1: "",
    shippingCity: "",
    shippingCountry: "",
    shippingPostal: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      router.push(`/shop/orders/${data.order.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, name: keyof typeof form, placeholder: string) => (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      <input
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Package size={16} className="text-neon-blue" />
          <h3 className="font-semibold text-sm">Shipping Details</h3>
          <span className="text-xs text-text-muted">(optional for digital items)</span>
        </div>
        {field("Full Name", "shippingName", "Jane Doe")}
        {field("Address Line", "shippingLine1", "123 Main St")}
        <div className="grid grid-cols-2 gap-3">
          {field("City", "shippingCity", "Nairobi")}
          {field("Postal Code", "shippingPostal", "00100")}
        </div>
        {field("Country", "shippingCountry", "Kenya")}
      </div>

      {error && <p className="text-sm text-neon-red">{error}</p>}

      <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-text-muted text-sm">Order Total</span>
          <span className="text-xl font-bold text-neon-green">{currency} {total.toLocaleString()}</span>
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Placing Order…</> : "Continue to Payment"}
        </Button>
      </div>
    </form>
  );
}
