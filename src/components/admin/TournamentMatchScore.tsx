"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle, Clock, Camera, MessageCircle, Trophy, Home, Plane } from "lucide-react";

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
  player1SquadKey?: string | null;
  player2SquadKey?: string | null;
  player1TeamName?: string | null;
  player2TeamName?: string | null;
  player1ResultKey?: string | null;
  player2ResultKey?: string | null;
  // Leg 2 for home & away ties — note: in the DB, leg2.player1 = original player2, leg2.player2 = original player1
  leg2MatchId?: string | null;
  leg2P1Score?: number | null;
  leg2P2Score?: number | null;
  leg2Status?: string | null;
  leg2Player1ResultKey?: string | null;
  leg2Player2ResultKey?: string | null;
}

export function TournamentMatchScore({
  tournamentId, matchId, player1, player2,
  currentP1Score, currentP2Score, currentWinnerId, status,
  player1SquadKey, player2SquadKey,
  player1TeamName, player2TeamName,
  player1ResultKey, player2ResultKey,
  leg2MatchId, leg2P1Score, leg2P2Score, leg2Status,
  leg2Player1ResultKey, leg2Player2ResultKey,
}: Props) {
  const router = useRouter();
  const [p1Score, setP1Score] = useState(currentP1Score?.toString() ?? "");
  const [p2Score, setP2Score] = useState(currentP2Score?.toString() ?? "");
  // leg2 scores: l2P1 = goals by original player2 (leg2.player1 in DB), l2P2 = goals by original player1 (leg2.player2 in DB)
  const [l2P1, setL2P1] = useState(leg2P1Score?.toString() ?? "");
  const [l2P2, setL2P2] = useState(leg2P2Score?.toString() ?? "");
  const [winnerId, setWinnerId] = useState(currentWinnerId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewShot, setViewShot] = useState<string | null>(null);

  const hasLeg2 = !!leg2MatchId;
  // Aggregate: original player1 total = leg1.p1 + leg2.p2; original player2 total = leg1.p2 + leg2.p1
  const aggP1 = (Number(p1Score) || 0) + (Number(l2P2) || 0);
  const aggP2 = (Number(p2Score) || 0) + (Number(l2P1) || 0);

  function recalcWinner(lp1: string, lp2: string, l2p1: string, l2p2: string) {
    if (!hasLeg2) {
      const n1 = Number(lp1); const n2 = Number(lp2);
      if (!isNaN(n1) && !isNaN(n2) && lp1 !== "" && lp2 !== "" && n1 !== n2) {
        setWinnerId(n1 > n2 ? (player1?.id ?? "") : (player2?.id ?? ""));
      }
    } else {
      const agg1 = (Number(lp1) || 0) + (Number(l2p2) || 0);
      const agg2 = (Number(lp2) || 0) + (Number(l2p1) || 0);
      if (agg1 > agg2) setWinnerId(player1?.id ?? "");
      else if (agg2 > agg1) setWinnerId(player2?.id ?? "");
      // Equal aggregate — admin must select manually (extra time / penalties)
    }
  }

  const isCompleted = status === "COMPLETED" || status === "WALKOVER";
  const leg2Done = !hasLeg2 || leg2Status === "COMPLETED" || leg2Status === "WALKOVER";
  const bothComplete = isCompleted && leg2Done;

  const p1Name = player1?.displayName ?? player1?.username ?? "Player 1";
  const p2Name = player2?.displayName ?? player2?.username ?? "Player 2";

  // ── Completed ──────────────────────────────────────────────────
  if (bothComplete) {
    const winner = player1?.id === currentWinnerId ? player1 : player2;
    const doneAggP1 = (currentP1Score ?? 0) + (leg2P2Score ?? 0);
    const doneAggP2 = (currentP2Score ?? 0) + (leg2P1Score ?? 0);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm space-y-0.5">
            {hasLeg2 ? (
              <>
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="text-[10px] flex items-center gap-0.5 w-14 shrink-0"><Home size={8} /> Leg 1</span>
                  <span className="font-mono">{currentP1Score ?? "—"} – {currentP2Score ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="text-[10px] flex items-center gap-0.5 w-14 shrink-0"><Plane size={8} /> Leg 2</span>
                  <span className="font-mono">{leg2P2Score ?? "—"} – {leg2P1Score ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-primary w-14 shrink-0">Agg</span>
                  <span className="font-mono font-bold">{doneAggP1} – {doneAggP2}</span>
                  {winner && (
                    <span className="text-neon-green font-semibold text-xs flex items-center gap-1">
                      <CheckCircle size={11} /> {winner.displayName ?? winner.username}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-text-muted">
                <span className="font-mono">{currentP1Score ?? "—"} – {currentP2Score ?? "—"}</span>
                {winner && (
                  <span className="text-neon-green font-semibold text-xs flex items-center gap-1">
                    <CheckCircle size={11} /> {winner.displayName ?? winner.username}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {player1SquadKey && (
              <button onClick={() => setViewShot(imgUrl(player1SquadKey!))} className="text-[10px] text-text-muted hover:text-neon-blue flex items-center gap-0.5">
                <Camera size={9} /> Squad ({p1Name})
              </button>
            )}
            {player2SquadKey && (
              <button onClick={() => setViewShot(imgUrl(player2SquadKey!))} className="text-[10px] text-text-muted hover:text-neon-blue flex items-center gap-0.5">
                <Camera size={9} /> Squad ({p2Name})
              </button>
            )}
            {player1ResultKey && (
              <button onClick={() => setViewShot(imgUrl(player1ResultKey!))} className="text-[10px] text-neon-blue hover:underline flex items-center gap-0.5">
                <Trophy size={9} /> {p1Name} L1
              </button>
            )}
            {player2ResultKey && (
              <button onClick={() => setViewShot(imgUrl(player2ResultKey!))} className="text-[10px] text-neon-blue hover:underline flex items-center gap-0.5">
                <Trophy size={9} /> {p2Name} L1
              </button>
            )}
            {leg2Player1ResultKey && (
              <button onClick={() => setViewShot(imgUrl(leg2Player1ResultKey!))} className="text-[10px] text-neon-blue hover:underline flex items-center gap-0.5">
                <Trophy size={9} /> {p2Name} L2
              </button>
            )}
            {leg2Player2ResultKey && (
              <button onClick={() => setViewShot(imgUrl(leg2Player2ResultKey!))} className="text-[10px] text-neon-blue hover:underline flex items-center gap-0.5">
                <Trophy size={9} /> {p1Name} L2
              </button>
            )}
          </div>
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
      // Leg 1 per-leg winner (auto-calculated from scores)
      const n1 = Number(p1Score); const n2 = Number(p2Score);
      const leg1WinnerId = (!isNaN(n1) && !isNaN(n2) && n1 !== n2)
        ? (n1 > n2 ? player1!.id : player2!.id)
        : winnerId;

      const res1 = await fetch(`/api/admin/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1Score: Number(p1Score),
          player2Score: Number(p2Score),
          winnerId: hasLeg2 ? leg1WinnerId : winnerId,
        }),
      });
      if (!res1.ok) { const d = await res1.json(); setError(d.error ?? "Failed"); return; }

      if (hasLeg2) {
        // leg2.player1Score = l2P1 (original p2's goals), leg2.player2Score = l2P2 (original p1's goals)
        // leg2.winnerId = overall tie winner (for knockout bracket advancement)
        const res2 = await fetch(`/api/admin/tournaments/${tournamentId}/matches/${leg2MatchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player1Score: Number(l2P1),
            player2Score: Number(l2P2),
            winnerId,
          }),
        });
        if (!res2.ok) { const d = await res2.json(); setError(d.error ?? "Failed"); return; }
      }

      router.refresh();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  const inp = "w-14 text-center px-2 py-1 rounded-lg bg-bg-base border border-bg-border text-sm focus:outline-none focus:border-neon-blue/50";

  return (
    <div className="space-y-3">
      {/* Pre-match checklist */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { player: player1, squadKey: player1SquadKey, teamName: player1TeamName },
          { player: player2, squadKey: player2SquadKey, teamName: player2TeamName },
        ] as const).map(({ player, squadKey, teamName }) => (
          <div key={player.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${squadKey ? "border-neon-green/20 bg-neon-green/5" : "border-bg-border bg-bg-elevated"}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{player.displayName ?? player.username}</p>
              {teamName && <p className="text-[10px] text-text-muted truncate">{teamName}</p>}
              <p className={`flex items-center gap-1 mt-0.5 ${squadKey ? "text-neon-green" : "text-yellow-400"}`}>
                {squadKey ? <><CheckCircle size={9} /> Squad verified</> : <><Clock size={9} /> No screenshot yet</>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {squadKey ? (
                <button onClick={() => setViewShot(imgUrl(squadKey))} className="text-neon-blue hover:underline flex items-center gap-0.5 text-[10px]">
                  <Camera size={10} /> View
                </button>
              ) : <Camera size={10} className="text-text-muted opacity-30" />}
              <Link href={`/messages/${player.id}`} className="text-text-muted hover:text-neon-blue transition-colors" title={`Message ${player.username}`}>
                <MessageCircle size={11} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Result screenshots */}
      {(player1ResultKey || player2ResultKey || leg2Player1ResultKey || leg2Player2ResultKey) && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1">
            <Trophy size={9} /> Result screenshots
          </p>
          <div className="flex flex-wrap gap-2">
            {player1ResultKey && (
              <button onClick={() => setViewShot(imgUrl(player1ResultKey!))} className="flex items-center gap-1 text-xs text-neon-blue hover:underline">
                <Camera size={10} /> {p1Name} (L1)
              </button>
            )}
            {player2ResultKey && (
              <button onClick={() => setViewShot(imgUrl(player2ResultKey!))} className="flex items-center gap-1 text-xs text-neon-blue hover:underline">
                <Camera size={10} /> {p2Name} (L1)
              </button>
            )}
            {leg2Player1ResultKey && (
              <button onClick={() => setViewShot(imgUrl(leg2Player1ResultKey!))} className="flex items-center gap-1 text-xs text-neon-blue hover:underline">
                <Camera size={10} /> {p2Name} (L2)
              </button>
            )}
            {leg2Player2ResultKey && (
              <button onClick={() => setViewShot(imgUrl(leg2Player2ResultKey!))} className="flex items-center gap-1 text-xs text-neon-blue hover:underline">
                <Camera size={10} /> {p1Name} (L2)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Score entry */}
      <form onSubmit={submit} className="space-y-2">
        {/* Leg 1 */}
        <div>
          {hasLeg2 && (
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1 mb-1">
              <Home size={9} /> Leg 1 — {p1Name} at home
            </p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted text-xs truncate flex-1">{p1Name}</span>
            <input type="number" min="0" value={p1Score}
              onChange={e => { setP1Score(e.target.value); recalcWinner(e.target.value, p2Score, l2P1, l2P2); }}
              className={inp} placeholder="0" />
            <span className="text-text-muted">–</span>
            <input type="number" min="0" value={p2Score}
              onChange={e => { setP2Score(e.target.value); recalcWinner(p1Score, e.target.value, l2P1, l2P2); }}
              className={inp} placeholder="0" />
            <span className="text-text-muted text-xs truncate flex-1 text-right">{p2Name}</span>
          </div>
        </div>

        {/* Leg 2 */}
        {hasLeg2 && (
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1 mb-1">
              <Plane size={9} /> Leg 2 — {p2Name} at home
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-muted text-xs truncate flex-1">{p2Name}</span>
              <input type="number" min="0" value={l2P1}
                onChange={e => { setL2P1(e.target.value); recalcWinner(p1Score, p2Score, e.target.value, l2P2); }}
                className={inp} placeholder="0" />
              <span className="text-text-muted">–</span>
              <input type="number" min="0" value={l2P2}
                onChange={e => { setL2P2(e.target.value); recalcWinner(p1Score, p2Score, l2P1, e.target.value); }}
                className={inp} placeholder="0" />
              <span className="text-text-muted text-xs truncate flex-1 text-right">{p1Name}</span>
            </div>
          </div>
        )}

        {/* Aggregate display */}
        {hasLeg2 && (p1Score !== "" || l2P1 !== "") && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Aggregate</span>
            <span className="font-mono font-bold text-sm">
              <span className={aggP1 > aggP2 ? "text-neon-green" : "text-text-primary"}>{aggP1}</span>
              <span className="text-text-muted mx-1">–</span>
              <span className={aggP2 > aggP1 ? "text-neon-green" : "text-text-primary"}>{aggP2}</span>
            </span>
            {aggP1 === aggP2 && p1Score !== "" && (
              <span className="text-[10px] text-yellow-400 ml-auto">Tied — select winner manually</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <select value={winnerId} onChange={e => setWinnerId(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-bg-base border border-bg-border focus:outline-none focus:border-neon-green/50">
            <option value="">{hasLeg2 ? "Select tie winner…" : "Select winner…"}</option>
            <option value={player1.id}>{p1Name}</option>
            <option value={player2.id}>{p2Name}</option>
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
        <img src={url} alt="Screenshot" className="w-full rounded-2xl border border-bg-border shadow-2xl" />
        <button onClick={onClose} className="absolute top-2 right-2 bg-bg-elevated border border-bg-border rounded-full px-3 py-1 text-xs text-text-muted hover:text-text-primary">
          Close
        </button>
      </div>
    </div>
  );
}
