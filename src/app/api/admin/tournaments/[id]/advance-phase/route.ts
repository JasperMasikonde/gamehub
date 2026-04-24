import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Params = { params: Promise<{ id: string }> };

// Calculate standings for a set of participants and matches
function calcGroupStandings(participantIds: string[], matches: { player1Id: string | null; player2Id: string | null; player1Score: number | null; player2Score: number | null; winnerId: string | null; status: string }[]) {
  const stats = new Map<string, { pts: number; gf: number; ga: number; played: number }>();
  for (const pid of participantIds) stats.set(pid, { pts: 0, gf: 0, ga: 0, played: 0 });

  for (const m of matches) {
    if (m.status !== "COMPLETED" && m.status !== "WALKOVER") continue;
    const p1 = m.player1Id;
    const p2 = m.player2Id;
    if (!p1 || !p2) continue;
    const s1 = stats.get(p1);
    const s2 = stats.get(p2);
    if (!s1 || !s2) continue;
    const g1 = m.player1Score ?? 0;
    const g2 = m.player2Score ?? 0;
    s1.gf += g1; s1.ga += g2; s1.played++;
    s2.gf += g2; s2.ga += g1; s2.played++;
    if (m.winnerId === p1) { s1.pts += 3; }
    else if (m.winnerId === p2) { s2.pts += 3; }
    else { s1.pts += 1; s2.pts += 1; }
  }

  return [...stats.entries()]
    .sort(([, a], [, b]) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
    .map(([id]) => id);
}

export async function POST(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: { include: { participants: true, matches: true } },
      participants: true,
    },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.type !== "CHAMPIONS_LEAGUE") return NextResponse.json({ error: "Only for Champions League tournaments" }, { status: 400 });
  if (tournament.phase !== "GROUP") return NextResponse.json({ error: "Already in knockout phase" }, { status: 400 });

  const groupsAdvance = tournament.groupsAdvance ?? 2;

  // Gather teams that advance from each group
  const advancingIds: string[] = [];
  for (const group of tournament.groups) {
    const participantIds = group.participants.map(p => p.userId);
    const ranked = calcGroupStandings(participantIds, group.matches);
    advancingIds.push(...ranked.slice(0, groupsAdvance));
  }

  if (advancingIds.length < 2) {
    return NextResponse.json({ error: "Not enough teams to advance" }, { status: 400 });
  }

  // Shuffle advancing teams
  for (let i = advancingIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [advancingIds[i], advancingIds[j]] = [advancingIds[j], advancingIds[i]];
  }

  const n = advancingIds.length;
  const totalRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, totalRounds);

  // Create all match placeholders for knockout rounds
  const matchRefs: { id: string }[][] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r);
    const roundMatches: { id: string }[] = [];
    for (let mn = 1; mn <= matchCount; mn++) {
      const m = await prisma.tournamentMatch.create({
        data: { tournamentId: id, round: r, matchNumber: mn, status: "SCHEDULED" },
        select: { id: true },
      });
      roundMatches.push(m);
    }
    matchRefs.push(roundMatches);
  }

  // Link round 1 matches to round 2 parents
  for (let r = 0; r < matchRefs.length - 1; r++) {
    for (let i = 0; i < matchRefs[r].length; i++) {
      const parentIdx = Math.floor(i / 2);
      await prisma.tournamentMatch.update({
        where: { id: matchRefs[r][i].id },
        data: { nextMatchId: matchRefs[r + 1][parentIdx].id },
      });
    }
  }

  // Fill round 1 with advancing teams, rest are byes
  const round1 = matchRefs[0];
  let advIdx = 0;
  for (let i = 0; i < round1.length; i++) {
    const p1 = advancingIds[advIdx++] ?? null;
    const p2 = advancingIds[advIdx++] ?? null;
    if (p1 && !p2) {
      // Bye — auto-advance p1
      await prisma.tournamentMatch.update({
        where: { id: round1[i].id },
        data: { player1Id: p1, status: "WALKOVER", winnerId: p1, completedAt: new Date() },
      });
      if (round1[i + 1] !== undefined) {
        const parentMatch = matchRefs[1]?.[Math.floor(i / 2)];
        if (parentMatch) {
          const existing = await prisma.tournamentMatch.findUnique({ where: { id: parentMatch.id } });
          await prisma.tournamentMatch.update({
            where: { id: parentMatch.id },
            data: { [existing?.player1Id ? "player2Id" : "player1Id"]: p1 },
          });
        }
      }
    } else {
      await prisma.tournamentMatch.update({
        where: { id: round1[i].id },
        data: { player1Id: p1 ?? null, player2Id: p2 ?? null },
      });
    }
  }

  // Update tournament to knockout phase
  await prisma.tournament.update({
    where: { id },
    data: { phase: "KNOCKOUT", currentGameweek: 0 },
  });

  emitTournamentUpdate(id, tournament.slug);
  return NextResponse.json({ ok: true, advancing: advancingIds.length });
}
