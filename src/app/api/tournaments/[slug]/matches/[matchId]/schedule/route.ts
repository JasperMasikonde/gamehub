import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Params = { params: Promise<{ slug: string; matchId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { slug, matchId } = await params;
  const body = await req.json() as { action: "propose" | "accept" | "decline"; scheduledAt?: string };

  const tournament = await prisma.tournament.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const match = await prisma.tournamentMatch.findFirst({
    where: { id: matchId, tournamentId: tournament.id },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const isP1 = match.player1Id === userId;
  const isP2 = match.player2Id === userId;
  if (!isP1 && !isP2) return NextResponse.json({ error: "Not your match" }, { status: 403 });

  if (body.action === "propose") {
    if (!body.scheduledAt) return NextResponse.json({ error: "No time provided" }, { status: 400 });
    const date = new Date(body.scheduledAt);
    if (isNaN(date.getTime()) || date <= new Date()) {
      return NextResponse.json({ error: "Proposed time must be in the future" }, { status: 400 });
    }
    const updated = await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: { proposedMatchTime: date, proposedById: userId, scheduledAt: null },
    });
    emitTournamentUpdate(tournament.id, slug);
    return NextResponse.json({ match: updated });
  }

  if (body.action === "accept") {
    if (!match.proposedMatchTime || !match.proposedById) {
      return NextResponse.json({ error: "No proposal to accept" }, { status: 400 });
    }
    if (match.proposedById === userId) {
      return NextResponse.json({ error: "Cannot accept your own proposal" }, { status: 400 });
    }
    const updated = await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: { scheduledAt: match.proposedMatchTime, proposedMatchTime: null, proposedById: null },
    });
    emitTournamentUpdate(tournament.id, slug);
    return NextResponse.json({ match: updated });
  }

  if (body.action === "decline") {
    const updated = await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: { proposedMatchTime: null, proposedById: null },
    });
    emitTournamentUpdate(tournament.id, slug);
    return NextResponse.json({ match: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
