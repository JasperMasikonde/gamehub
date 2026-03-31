"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

interface Player { id: string; username: string; displayName: string | null; }
interface Props {
  tournamentId: string;
  matchId: string;
  player1: Player | null;
  player2: Player | null;
  currentP1Score?: number | null;
  currentP2Score?: number | null;
  currentWinnerId?: string | null;
  status: string;
}

export function TournamentMatchScore({ tournamentId, matchId, player1, player2, currentP1Score, currentP2Score, currentWinnerId, status }: Props) {
  const router = useRouter();
  const [p1Score, setP1Score] = useState(currentP1Score?.toString() ?? "");
  const [p2Score, setP2Score] = useState(currentP2Score?.toString() ?? "");
  const [winnerId, setWinnerId] = useState(currentWinnerId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "COMPLETED" || status === "WALKOVER") {
    const winner = player1?.id === currentWinnerId ? player1 : player2;
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-muted">{currentP1Score ?? "—"} – {currentP2Score ?? "—"}</span>
        {winner && <span className="text-neon-green font-semibold text-xs">✓ {winner.displayName ?? winner.username}</span>}
      </div>
    );
  }

  if (!player1 || !player2) {
    return <span className="text-xs text-text-muted italic">Awaiting players</span>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerId) { setError("Select a winner"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1Score: Number(p1Score), player2Score: Number(p2Score), winnerId }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      router.refresh();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  const inp = "w-14 text-center px-2 py-1 rounded-lg bg-bg-base border border-bg-border text-sm focus:outline-none focus:border-neon-blue/50";

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted w-28 truncate">{player1.displayName ?? player1.username}</span>
        <input type="number" min="0" value={p1Score} onChange={e => setP1Score(e.target.value)} className={inp} placeholder="0" />
        <span className="text-text-muted">–</span>
        <input type="number" min="0" value={p2Score} onChange={e => setP2Score(e.target.value)} className={inp} placeholder="0" />
        <span className="text-text-muted w-28 truncate text-right">{player2.displayName ?? player2.username}</span>
      </div>
      <div className="flex items-center gap-2">
        <select value={winnerId} onChange={e => setWinnerId(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-bg-base border border-bg-border focus:outline-none focus:border-neon-green/50">
          <option value="">Winner…</option>
          <option value={player1.id}>{player1.displayName ?? player1.username}</option>
          <option value={player2.id}>{player2.displayName ?? player2.username}</option>
        </select>
        <Button type="submit" size="sm" variant="primary" disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </form>
  );
}
