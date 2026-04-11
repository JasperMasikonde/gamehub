"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle } from "lucide-react";

interface Props {
  currentMin: number;
  currentMax: number | null;
}

export function WagerLimitsForm({ currentMin, currentMax }: Props) {
  const [minWager, setMinWager] = useState(String(currentMin));
  const [maxWager, setMaxWager] = useState(currentMax != null ? String(currentMax) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/fees/wager-limits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minWagerAmount: Number(minWager) || 0,
        maxWagerAmount: maxWager ? Number(maxWager) : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "Failed to save");
    }
  };

  const cls = "px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors w-full";

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
      <h3 className="font-semibold text-sm mb-1">Wager Limits</h3>
      <p className="text-xs text-text-muted mb-4">
        Set the minimum and maximum wager amounts players can use when hosting a challenge. Leave max blank for no upper limit.
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-sm mb-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Min Wager (KES)</label>
          <input type="number" min="0" value={minWager} onChange={e => setMinWager(e.target.value)} placeholder="0" className={cls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Max Wager (KES)</label>
          <input type="number" min="0" value={maxWager} onChange={e => setMaxWager(e.target.value)} placeholder="No limit" className={cls} />
        </div>
      </div>
      {error && <p className="text-sm text-neon-red mb-3">{error}</p>}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="primary" onClick={() => void handleSave()} loading={loading}>
          Save Limits
        </Button>
        {saved && (
          <span className="text-xs text-neon-green flex items-center gap-1">
            <CheckCircle size={12} /> Saved!
          </span>
        )}
      </div>
    </div>
  );
}
