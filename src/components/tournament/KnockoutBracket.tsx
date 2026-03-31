"use client";

interface Player { id: string; username: string; displayName: string | null; }
interface Match {
  id: string; round: number; matchNumber: number;
  player1: Player | null; player2: Player | null;
  player1Score: number | null; player2Score: number | null;
  winnerId: string | null; status: string;
}

interface Props { matches: Match[]; }

function MatchCard({ match }: { match: Match }) {
  const isP1Winner = match.winnerId === match.player1?.id;
  const isP2Winner = match.winnerId === match.player2?.id;
  const done = match.status === "COMPLETED" || match.status === "WALKOVER";

  const slot = (player: Player | null, score: number | null, isWinner: boolean) => (
    <div className={`flex items-center justify-between px-3 py-2 border-b border-bg-border last:border-0 ${isWinner ? "bg-neon-green/5" : ""}`}>
      <span className={`text-sm truncate max-w-[120px] ${isWinner ? "text-neon-green font-semibold" : "text-text-muted"}`}>
        {player ? (player.displayName ?? player.username) : <span className="italic opacity-50">TBD</span>}
        {isWinner && " ✓"}
      </span>
      <span className={`text-sm font-bold ml-2 ${isWinner ? "text-neon-green" : "text-text-muted"}`}>
        {done && score != null ? score : "—"}
      </span>
    </div>
  );

  return (
    <div className={`w-56 rounded-xl overflow-hidden border ${done ? "border-neon-green/20" : "border-bg-border"} bg-bg-surface text-xs`}>
      <div className="px-3 py-1 bg-bg-elevated border-b border-bg-border">
        <span className="text-text-muted">Match {match.matchNumber}</span>
      </div>
      {slot(match.player1, match.player1Score, isP1Winner)}
      {slot(match.player2, match.player2Score, isP2Winner)}
    </div>
  );
}

export function KnockoutBracket({ matches }: Props) {
  if (!matches.length) return <p className="text-text-muted text-sm">Bracket not generated yet.</p>;

  const rounds: Record<number, Match[]> = {};
  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  }
  const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = roundNums.length;
  const roundLabels: Record<number, string> = {};
  roundNums.forEach((r, i) => {
    const remaining = totalRounds - i;
    if (remaining === 1) roundLabels[r] = "Final";
    else if (remaining === 2) roundLabels[r] = "Semi Final";
    else if (remaining === 3) roundLabels[r] = "Quarter Final";
    else roundLabels[r] = `Round ${r}`;
  });

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {roundNums.map((round) => (
          <div key={round} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide text-center mb-2">
              {roundLabels[round]}
            </p>
            <div className="flex flex-col gap-4" style={{ justifyContent: "space-around", height: "100%" }}>
              {rounds[round].map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
