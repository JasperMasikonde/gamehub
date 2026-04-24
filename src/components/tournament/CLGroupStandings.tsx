"use client";

interface Participant {
  userId: string;
  user: { id: string; username: string; displayName: string | null };
}

interface Group {
  id: string;
  name: string;
  order: number;
  participants: Participant[];
  matches: {
    player1Id: string | null;
    player2Id: string | null;
    player1Score: number | null;
    player2Score: number | null;
    winnerId: string | null;
    status: string;
  }[];
}

interface Props {
  groups: Group[];
  groupsAdvance: number;
}

function calcStandings(participants: Participant[], matches: Group["matches"]) {
  const stats = new Map<string, { pts: number; gf: number; ga: number; w: number; d: number; l: number; played: number }>();
  for (const p of participants) stats.set(p.userId, { pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0, played: 0 });

  for (const m of matches) {
    if (m.status !== "COMPLETED" && m.status !== "WALKOVER") continue;
    const p1 = m.player1Id; const p2 = m.player2Id;
    if (!p1 || !p2) continue;
    const s1 = stats.get(p1); const s2 = stats.get(p2);
    if (!s1 || !s2) continue;
    const g1 = m.player1Score ?? 0; const g2 = m.player2Score ?? 0;
    s1.gf += g1; s1.ga += g2; s1.played++;
    s2.gf += g2; s2.ga += g1; s2.played++;
    if (m.winnerId === p1) { s1.pts += 3; s1.w++; s2.l++; }
    else if (m.winnerId === p2) { s2.pts += 3; s2.w++; s1.l++; }
    else { s1.pts++; s2.pts++; s1.d++; s2.d++; }
  }

  return [...stats.entries()]
    .map(([id, s]) => ({ id, ...s, gd: s.gf - s.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

export function CLGroupStandings({ groups, groupsAdvance }: Props) {
  const sorted = [...groups].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sorted.map(group => {
        const standings = calcStandings(group.participants, group.matches);
        return (
          <div key={group.id} className="bg-bg-elevated border border-bg-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-bg-border bg-bg-surface">
              <h3 className="text-sm font-bold text-text-primary">{group.name}</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-bg-border">
                  <th className="text-left px-4 py-2 font-medium w-6">#</th>
                  <th className="text-left px-4 py-2 font-medium">Player</th>
                  <th className="text-center px-2 py-2 font-medium">P</th>
                  <th className="text-center px-2 py-2 font-medium">W</th>
                  <th className="text-center px-2 py-2 font-medium">D</th>
                  <th className="text-center px-2 py-2 font-medium">L</th>
                  <th className="text-center px-2 py-2 font-medium">GD</th>
                  <th className="text-center px-2 py-2 font-medium font-bold">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {standings.map((s, i) => {
                  const p = group.participants.find(pa => pa.userId === s.id);
                  const advancing = i < groupsAdvance;
                  return (
                    <tr key={s.id} className={advancing ? "bg-neon-green/5" : ""}>
                      <td className="px-4 py-2.5 text-text-muted">
                        {advancing ? <span className="w-4 h-4 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-[10px] font-bold">{i + 1}</span> : <span className="text-text-muted">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-text-primary truncate max-w-[120px]">
                        {p?.user.displayName ?? p?.user.username ?? s.id.slice(0, 8)}
                        {advancing && <span className="ml-1 text-[9px] text-neon-green">Q</span>}
                      </td>
                      <td className="text-center px-2 py-2.5 text-text-muted">{s.played}</td>
                      <td className="text-center px-2 py-2.5 text-text-muted">{s.w}</td>
                      <td className="text-center px-2 py-2.5 text-text-muted">{s.d}</td>
                      <td className="text-center px-2 py-2.5 text-text-muted">{s.l}</td>
                      <td className={`text-center px-2 py-2.5 font-mono ${s.gd > 0 ? "text-neon-green" : s.gd < 0 ? "text-neon-red" : "text-text-muted"}`}>
                        {s.gd > 0 ? "+" : ""}{s.gd}
                      </td>
                      <td className="text-center px-2 py-2.5 font-bold text-text-primary">{s.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-1.5 border-t border-bg-border">
              <p className="text-[10px] text-text-muted">Top {groupsAdvance} advance · <span className="inline-block w-2 h-2 rounded-full bg-neon-green/30 mr-0.5" />Qualified</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
