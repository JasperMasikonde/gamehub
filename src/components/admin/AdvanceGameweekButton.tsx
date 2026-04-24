"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props { tournamentId: string; currentGameweek: number; }

export function AdvanceGameweekButton({ tournamentId, currentGameweek }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function advance() {
    setLoading(true); setError("");
    const res = await fetch(`/api/admin/tournaments/${tournamentId}/advance-gameweek`, { method: "POST" });
    setLoading(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: string }; setError(j.error ?? "Failed"); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">GW{currentGameweek} active</span>
        <Button size="sm" variant="secondary" onClick={() => void advance()} loading={loading}>
          <ChevronRight size={12} /> Open GW{currentGameweek + 1}
        </Button>
      </div>
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}
