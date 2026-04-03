import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try { await requirePermission("MANAGE_TOURNAMENTS"); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: tournamentId, userId } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tournament.status === "IN_PROGRESS" || tournament.status === "COMPLETED")
    return NextResponse.json({ error: "Cannot remove participants from an active tournament" }, { status: 400 });

  await prisma.tournamentParticipant.delete({
    where: { tournamentId_userId: { tournamentId, userId } },
  });

  emitTournamentUpdate(tournamentId, tournament.slug);
  return NextResponse.json({ success: true });
}
