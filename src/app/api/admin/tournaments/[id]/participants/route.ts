import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Ctx = { params: Promise<{ id: string }> };

// POST: add a user by username or email
export async function POST(req: NextRequest, { params }: Ctx) {
  try { await requirePermission("MANAGE_TOURNAMENTS"); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: tournamentId } = await params;
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "Provide a username or email" }, { status: 400 });

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  if (tournament.status === "COMPLETED" || tournament.status === "CANCELLED")
    return NextResponse.json({ error: "Cannot add participants to a finished tournament" }, { status: 400 });

  const participantCount = await prisma.tournamentParticipant.count({ where: { tournamentId } });
  if (participantCount >= tournament.maxParticipants)
    return NextResponse.json({ error: "Tournament is full" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: query.trim() }, { email: query.trim() }] },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: user.id } },
  });
  if (existing) return NextResponse.json({ error: "User is already a participant" }, { status: 409 });

  const participant = await prisma.tournamentParticipant.create({
    data: { tournamentId, userId: user.id },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  emitTournamentUpdate(tournamentId, tournament.slug);
  return NextResponse.json({ participant });
}
