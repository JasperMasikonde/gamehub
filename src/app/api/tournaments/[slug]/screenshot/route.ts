import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Ctx = { params: Promise<{ slug: string }> };

// POST — player submits their squad screenshot once for the tournament
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { gcsKey, teamName } = await req.json();
  if (!gcsKey) return NextResponse.json({ error: "gcsKey required" }, { status: 400 });

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId: tournament.id, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "You are not registered in this tournament" }, { status: 403 });

  const updated = await prisma.tournamentParticipant.update({
    where: { id: participant.id },
    data: { squadScreenshotKey: gcsKey, ...(teamName ? { teamName } : {}) },
  });

  emitTournamentUpdate(tournament.id, slug);
  return NextResponse.json({ participant: updated });
}
