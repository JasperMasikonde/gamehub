import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { participants: { include: { user: { select: { id: true } } }, orderBy: { seed: "asc" } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.status !== "REGISTRATION_OPEN")
    return NextResponse.json({ error: "Tournament must be in REGISTRATION_OPEN status" }, { status: 400 });
  if (tournament.participants.length < 2)
    return NextResponse.json({ error: "Need at least 2 participants" }, { status: 400 });

  const participants = tournament.participants.map((p) => p.userId);

  // Shuffle
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  await prisma.tournamentMatch.deleteMany({ where: { tournamentId: id } });

  if (tournament.type === "LEAGUE") {
    const matchData = [];
    let matchNumber = 1;
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchData.push({ tournamentId: id, round: 1, matchNumber: matchNumber++, player1Id: participants[i], player2Id: participants[j] });
      }
    }
    await prisma.tournamentMatch.createMany({ data: matchData });
  } else {
    // KNOCKOUT: build rounds bottom-up
    const n = participants.length;
    const totalRounds = Math.ceil(Math.log2(n));
    const bracketSize = Math.pow(2, totalRounds);

    // Create all placeholder matches
    type MatchPlaceholder = { tournamentId: string; round: number; matchNumber: number; player1Id: string | null; player2Id: string | null; nextMatchId: string | null };
    const allMatches: MatchPlaceholder[] = [];
    let matchNumber = 1;
    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let m = 0; m < matchesInRound; m++) {
        allMatches.push({ tournamentId: id, round, matchNumber: matchNumber++, player1Id: null, player2Id: null, nextMatchId: null });
      }
    }

    // Create them without nextMatchId first
    const created = await prisma.$transaction(
      allMatches.map((m) => prisma.tournamentMatch.create({ data: m }))
    );

    // Map round → matches
    const byRound: Record<number, typeof created> = {};
    for (const m of created) {
      if (!byRound[m.round]) byRound[m.round] = [];
      byRound[m.round].push(m);
    }

    // Set nextMatchId: each pair in round r feeds into one match in round r+1
    for (let round = 1; round < totalRounds; round++) {
      const currentRound = byRound[round];
      const nextRound = byRound[round + 1];
      for (let i = 0; i < currentRound.length; i++) {
        const nextMatch = nextRound[Math.floor(i / 2)];
        await prisma.tournamentMatch.update({ where: { id: currentRound[i].id }, data: { nextMatchId: nextMatch.id } });
      }
    }

    // Fill round-1 participants; handle byes
    const r1 = byRound[1];
    for (let i = 0; i < r1.length; i++) {
      const p1 = participants[i * 2] ?? null;
      const p2 = participants[i * 2 + 1] ?? null;
      if (p1 && !p2) {
        // Bye — auto-advance p1
        await prisma.tournamentMatch.update({ where: { id: r1[i].id }, data: { player1Id: p1, status: "WALKOVER", winnerId: p1, completedAt: new Date() } });
        // Advance to next
        if (r1[i].nextMatchId) {
          const nextM = await prisma.tournamentMatch.findUnique({ where: { id: r1[i].nextMatchId! } });
          if (nextM) {
            await prisma.tournamentMatch.update({ where: { id: nextM.id }, data: nextM.player1Id ? { player2Id: p1 } : { player1Id: p1 } });
          }
        }
      } else {
        await prisma.tournamentMatch.update({ where: { id: r1[i].id }, data: { player1Id: p1, player2Id: p2 } });
      }
    }
  }

  const updated = await prisma.tournament.update({ where: { id }, data: { status: "IN_PROGRESS" } });
  emitTournamentUpdate(id, updated.slug);
  return NextResponse.json({ success: true });
}
