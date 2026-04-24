"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props { tournamentId: string; }

export function AdvancePhaseButton({ tournamentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  async function advance() {
    setLoading(true); setError("");
    const res = await fetch(`/api/admin/tournaments/${tournamentId}/advance-phase`, { method: "POST" });
    setLoading(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: string }; setError(j.error ?? "Failed"); return; }
    router.refresh();
  }

  if (!confirm) {
    return (
      <Button size="sm" variant="primary" onClick={() => setConfirm(true)}>
        <Trophy size={12} /> Advance to Knockout
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
      <p className="text-xs text-yellow-400">Calculate group standings and generate knockout bracket?</p>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => void advance()} loading={loading}>Confirm</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={loading}>Cancel</Button>
      </div>
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}
