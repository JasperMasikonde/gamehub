import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Ctx = { params: Promise<{ slug: string; matchId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, matchId } = await params;
  const { gcsKey } = await req.json();
  if (!gcsKey) return NextResponse.json({ error: "gcsKey required" }, { status: 400 });

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const match = await prisma.tournamentMatch.findFirst({
    where: { id: matchId, tournamentId: tournament.id },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const userId = session.user.id;
  if (match.player1Id !== userId && match.player2Id !== userId)
    return NextResponse.json({ error: "You are not a player in this match" }, { status: 403 });

  const field = match.player1Id === userId ? "player1ResultKey" : "player2ResultKey";
  await prisma.tournamentMatch.update({ where: { id: matchId }, data: { [field]: gcsKey } });

  emitTournamentUpdate(tournament.id, slug);
  return NextResponse.json({ success: true });
}
