"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props { tournamentId: string; currentGameweek: number; }

export function AdvanceGameweekButton({ tournamentId, currentGameweek }: Props) {
  const router = useRouter();
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function advance() {
    setLoading(true); setError("");
    const res = await fetch(`/api/admin/tournaments/${tournamentId}/advance-gameweek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  const nextGw = currentGameweek + 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted">GW{currentGameweek} active</span>
        <div className="flex items-center gap-1.5 rounded-xl border border-bg-border bg-bg-elevated px-2 py-1">
          <Calendar size={11} className="text-text-muted shrink-0" />
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="text-xs bg-transparent text-text-primary focus:outline-none w-36"
            title={`Deadline for GW${nextGw} matches`}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => void advance()} loading={loading}>
          <ChevronRight size={12} /> Open GW{nextGw}
        </Button>
      </div>
      <p className="text-[10px] text-text-muted leading-snug">
        Set a deadline so players can only propose times before it. Leave blank for no deadline.
      </p>
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}
