"use client";

interface Player { id: string; username: string; displayName: string | null; }
interface Match {
  player1Id: string | null; player2Id: string | null;
  player1Score: number | null; player2Score: number | null;
  winnerId: string | null; status: string;
}
interface Participant { userId: string; user: Player; }
interface Props { participants: Participant[]; matches: Match[]; }

interface Row { userId: string; name: string; played: number; wins: number; draws: number; losses: number; gf: number; ga: number; pts: number; }

export function LeagueStandings({ participants, matches }: Props) {
  const rows: Record<string, Row> = {};
  for (const p of participants) {
    rows[p.userId] = { userId: p.userId, name: p.user.displayName ?? p.user.username, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0 };
  }

  for (const m of matches) {
    if (m.status !== "COMPLETED" || m.player1Id == null || m.player2Id == null) continue;
    const r1 = rows[m.player1Id]; const r2 = rows[m.player2Id];
    if (!r1 || !r2) continue;
    r1.played++; r2.played++;
    r1.gf += m.player1Score ?? 0; r1.ga += m.player2Score ?? 0;
    r2.gf += m.player2Score ?? 0; r2.ga += m.player1Score ?? 0;
    if (m.winnerId === m.player1Id) { r1.wins++; r1.pts += 3; r2.losses++; }
    else if (m.winnerId === m.player2Id) { r2.wins++; r2.pts += 3; r1.losses++; }
    else { r1.draws++; r1.pts++; r2.draws++; r2.pts++; }
  }

  const sorted = Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-border text-text-muted text-xs">
            <th className="text-left p-3">#</th>
            <th className="text-left p-3">Player</th>
            <th className="p-3">P</th>
            <th className="p-3">W</th>
            <th className="p-3">D</th>
            <th className="p-3">L</th>
            <th className="p-3">GF</th>
            <th className="p-3">GA</th>
            <th className="p-3 text-neon-green font-bold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bg-border">
          {sorted.map((row, i) => (
            <tr key={row.userId} className={i === 0 ? "bg-neon-green/5" : "hover:bg-bg-elevated"}>
              <td className="p-3 text-text-muted font-bold">{i + 1}</td>
              <td className="p-3 font-medium">{row.name}</td>
              <td className="p-3 text-center text-text-muted">{row.played}</td>
              <td className="p-3 text-center text-neon-green">{row.wins}</td>
              <td className="p-3 text-center text-text-muted">{row.draws}</td>
              <td className="p-3 text-center text-neon-red">{row.losses}</td>
              <td className="p-3 text-center text-text-muted">{row.gf}</td>
              <td className="p-3 text-center text-text-muted">{row.ga}</td>
              <td className="p-3 text-center font-bold text-neon-green text-base">{row.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
