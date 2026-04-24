"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle, Clock, Camera, MessageCircle, Trophy } from "lucide-react";

const BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME ?? "";
function imgUrl(key: string) {
  return `https://storage.googleapis.com/${BUCKET}/${key}`;
}

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
  // Squad screenshots + team names come from TournamentParticipant
  player1SquadKey?: string | null;
  player2SquadKey?: string | null;
  player1TeamName?: string | null;
  player2TeamName?: string | null;
  // Result screenshots submitted per-match by each player
  player1ResultKey?: string | null;
  player2ResultKey?: string | null;
}

export function TournamentMatchScore({
  tournamentId, matchId, player1, player2,
  currentP1Score, currentP2Score, currentWinnerId, status,
  player1SquadKey, player2SquadKey,
  player1TeamName, player2TeamName,
  player1ResultKey, player2ResultKey,
}: Props) {
  const router = useRouter();
  const [p1Score, setP1Score] = useState(currentP1Score?.toString() ?? "");
  const [p2Score, setP2Score] = useState(currentP2Score?.toString() ?? "");
  const [winnerId, setWinnerId] = useState(currentWinnerId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewShot, setViewShot] = useState<string | null>(null);

  // Auto-set winner when both scores are entered
  function handleScoreChange(p1: string, p2: string) {
    const n1 = Number(p1); const n2 = Number(p2);
    if (!isNaN(n1) && !isNaN(n2) && p1 !== "" && p2 !== "" && (n1 !== n2)) {
      setWinnerId(n1 > n2 ? (player1?.id ?? "") : (player2?.id ?? ""));
    }
  }

  // ── Completed ──────────────────────────────────────────────────
  if (status === "COMPLETED" || status === "WALKOVER") {
    const winner = player1?.id === currentWinnerId ? player1 : player2;
    return (
      <div className="flex items-center justify-between text-sm gap-4">
        <div className="flex items-center gap-2 text-text-muted">
          <span className="font-mono">{currentP1Score ?? "—"} – {currentP2Score ?? "—"}</span>
          {winner && (
            <span className="text-neon-green font-semibold text-xs flex items-center gap-1">
              <CheckCircle size={11} /> {winner.displayName ?? winner.username}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {player1SquadKey && (
            <button onClick={() => setViewShot(imgUrl(player1SquadKey!))} className="text-[10px] text-text-muted hover:text-neon-blue flex items-center gap-0.5">
              <Camera size={9} /> Squad ({player1?.displayName ?? player1?.username})
            </button>
          )}
          {player2SquadKey && (
            <button onClick={() => setViewShot(imgUrl(player2SquadKey!))} className="text-[10px] text-text-muted hover:text-neon-blue flex items-center gap-0.5">
              <Camera size={9} /> Squad ({player2?.displayName ?? player2?.username})
            </button>
          )}
          {player1ResultKey && (
            <button onClick={() => setViewShot(imgUrl(player1ResultKey!))} className="text-[10px] text-neon-blue hover:underline flex items-center gap-0.5">
              <Trophy size={9} /> Result ({player1?.displayName ?? player1?.username})
            </button>
          )}
          {player2ResultKey && (
            <button onClick={() => setViewShot(imgUrl(player2ResultKey!))} className="text-[10px] text-neon-blue hover:underline flex items-center gap-0.5">
              <Trophy size={9} /> Result ({player2?.displayName ?? player2?.username})
            </button>
          )}
        </div>
        {viewShot && <ScreenshotModal url={viewShot} onClose={() => setViewShot(null)} />}
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
    <div className="space-y-3">
      {/* Pre-match checklist — one squad screenshot per player */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { player: player1, squadKey: player1SquadKey, teamName: player1TeamName },
          { player: player2, squadKey: player2SquadKey, teamName: player2TeamName },
        ] as const).map(({ player, squadKey, teamName }) => (
          <div
            key={player.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${squadKey ? "border-neon-green/20 bg-neon-green/5" : "border-bg-border bg-bg-elevated"}`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{player.displayName ?? player.username}</p>
              {teamName && <p className="text-[10px] text-text-muted truncate">{teamName}</p>}
              <p className={`flex items-center gap-1 mt-0.5 ${squadKey ? "text-neon-green" : "text-yellow-400"}`}>
                {squadKey
                  ? <><CheckCircle size={9} /> Squad verified</>
                  : <><Clock size={9} /> No screenshot yet</>
                }
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {squadKey ? (
                <button onClick={() => setViewShot(imgUrl(squadKey))} className="text-neon-blue hover:underline flex items-center gap-0.5 text-[10px]">
                  <Camera size={10} /> View
                </button>
              ) : (
                <Camera size={10} className="text-text-muted opacity-30" />
              )}
              <Link href={`/messages/${player.id}`} className="text-text-muted hover:text-neon-blue transition-colors" title={`Message ${player.username}`}>
                <MessageCircle size={11} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Result screenshots submitted by players */}
      {(player1ResultKey || player2ResultKey) && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1">
            <Trophy size={9} /> Match result screenshots
          </p>
          <div className="flex gap-2">
            {player1ResultKey ? (
              <button onClick={() => setViewShot(imgUrl(player1ResultKey!))} className="flex items-center gap-1 text-xs text-neon-blue hover:underline">
                <Camera size={10} /> {player1?.displayName ?? player1?.username}
              </button>
            ) : (
              <span className="text-xs text-text-muted italic">{player1?.displayName ?? player1?.username}: no result yet</span>
            )}
            <span className="text-text-muted">·</span>
            {player2ResultKey ? (
              <button onClick={() => setViewShot(imgUrl(player2ResultKey!))} className="flex items-center gap-1 text-xs text-neon-blue hover:underline">
                <Camera size={10} /> {player2?.displayName ?? player2?.username}
              </button>
            ) : (
              <span className="text-xs text-text-muted italic">{player2?.displayName ?? player2?.username}: no result yet</span>
            )}
          </div>
        </div>
      )}

      {/* Score entry */}
      <form onSubmit={submit} className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-muted text-xs truncate flex-1">{player1.displayName ?? player1.username}</span>
          <input type="number" min="0" value={p1Score} onChange={e => { setP1Score(e.target.value); handleScoreChange(e.target.value, p2Score); }} className={inp} placeholder="0" />
          <span className="text-text-muted">–</span>
          <input type="number" min="0" value={p2Score} onChange={e => { setP2Score(e.target.value); handleScoreChange(p1Score, e.target.value); }} className={inp} placeholder="0" />
          <span className="text-text-muted text-xs truncate flex-1 text-right">{player2.displayName ?? player2.username}</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={winnerId} onChange={e => setWinnerId(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-bg-base border border-bg-border focus:outline-none focus:border-neon-green/50">
            <option value="">Select winner…</option>
            <option value={player1.id}>{player1.displayName ?? player1.username}</option>
            <option value={player2.id}>{player2.displayName ?? player2.username}</option>
          </select>
          <Button type="submit" size="sm" variant="primary" disabled={loading}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : "Save"}
          </Button>
        </div>
        {error && <p className="text-xs text-neon-red">{error}</p>}
      </form>

      {viewShot && <ScreenshotModal url={viewShot} onClose={() => setViewShot(null)} />}
    </div>
  );
}

function ScreenshotModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative max-w-xl w-full" onClick={e => e.stopPropagation()}>
        <img src={url} alt="Squad screenshot" className="w-full rounded-2xl border border-bg-border shadow-2xl" />
        <button onClick={onClose} className="absolute top-2 right-2 bg-bg-elevated border border-bg-border rounded-full px-3 py-1 text-xs text-text-muted hover:text-text-primary">
          Close
        </button>
      </div>
    </div>
  );
}
