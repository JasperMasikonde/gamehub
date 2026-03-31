"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus } from "lucide-react";

export function FeeRuleForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [minWager, setMinWager] = useState("");
  const [maxWager, setMaxWager] = useState("");
  const [fee, setFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, minWager: Number(minWager), maxWager: Number(maxWager), fee: Number(fee) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Invalid input"); return; }
      setLabel(""); setMinWager(""); setMaxWager(""); setFee("");
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  const cls = "px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="bg-bg-surface border border-bg-border rounded-2xl p-5">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Plus size={14} className="text-neon-green" /> Add Fee Rule</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Low wager" required className={cls + " w-full"} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Min Wager (KES)</label>
          <input type="number" min="0" value={minWager} onChange={e => setMinWager(e.target.value)} placeholder="50" required className={cls + " w-full"} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Max Wager (KES)</label>
          <input type="number" min="0" value={maxWager} onChange={e => setMaxWager(e.target.value)} placeholder="300" required className={cls + " w-full"} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Platform Fee (KES)</label>
          <input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} placeholder="10" required className={cls + " w-full"} />
        </div>
      </div>
      {error && <p className="text-sm text-neon-red mb-3">{error}</p>}
      <Button type="submit" variant="primary" size="sm" disabled={loading}>
        {loading ? <><Loader2 size={13} className="animate-spin" /> Adding…</> : "Add Rule"}
      </Button>
    </form>
  );
}
