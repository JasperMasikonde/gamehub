import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; matchId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: tournamentId, matchId } = await params;
  const { player1Score, player2Score, winnerId } = await req.json();

  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== tournamentId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: { player1Score, player2Score, winnerId, status: "COMPLETED", completedAt: new Date() },
  });

  // KNOCKOUT: advance winner to next match
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (tournament?.type === "KNOCKOUT" && match.nextMatchId && winnerId) {
    const nextMatch = await prisma.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
    if (nextMatch) {
      const slot = nextMatch.player1Id ? { player2Id: winnerId } : { player1Id: winnerId };
      await prisma.tournamentMatch.update({ where: { id: nextMatch.id }, data: slot });
    }
  }

  // Check if tournament is complete
  const remaining = await prisma.tournamentMatch.count({
    where: { tournamentId, status: { not: "COMPLETED" }, player1Id: { not: null }, player2Id: { not: null } },
  });
  if (remaining === 0) {
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "COMPLETED" } });
  }

  const updated = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  return NextResponse.json({ match: updated });
}
