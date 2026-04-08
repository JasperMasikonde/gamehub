"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, Save } from "lucide-react";

export function EscrowFeeForm({ currentRate }: { currentRate: number }) {
  const router = useRouter();
  const [rate, setRate] = useState(String(currentRate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const cls = "px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary text-sm focus:outline-none focus:border-neon-blue/50 transition-colors w-32";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pct = parseFloat(rate);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setError("Enter a percentage between 0 and 100");
      return;
    }
    setError(""); setLoading(true); setSaved(false);
    try {
      const res = await fetch("/api/admin/config/escrow-fee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformFeeRate: pct / 100 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setSaved(true);
      router.refresh();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  const sellerGets = Math.max(0, 100 - parseFloat(rate || "0")).toFixed(1);

  return (
    <form onSubmit={handleSubmit} className="bg-bg-surface border border-bg-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Platform takes (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={rate}
            onChange={e => { setRate(e.target.value); setSaved(false); }}
            className={cls}
          />
        </div>
        <div className="pb-0.5">
          <p className="text-xs text-text-muted mb-1">Seller receives</p>
          <p className="text-lg font-bold text-neon-green">{sellerGets}%</p>
        </div>
        <Button type="submit" variant="primary" size="sm" disabled={loading} className="mb-0.5">
          {loading ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save</>}
        </Button>
      </div>
      {error && <p className="text-sm text-neon-red">{error}</p>}
      {saved && <p className="text-sm text-neon-green">Saved — new rate takes effect immediately.</p>}
      <p className="text-xs text-text-muted">
        Example: a KES 1,000 sale → platform keeps KES {(1000 * parseFloat(rate || "0") / 100).toFixed(0)}, seller receives KES {(1000 * parseFloat(sellerGets) / 100).toFixed(0)}.
      </p>
    </form>
  );
}
