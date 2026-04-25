import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { id: true, slug: true, currentGameweek: true, status: true } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.status !== "IN_PROGRESS") return NextResponse.json({ error: "Tournament not in progress" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as { deadline?: string };
  const deadline = body.deadline ? new Date(body.deadline) : null;
  if (deadline && isNaN(deadline.getTime())) {
    return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      currentGameweek: tournament.currentGameweek + 1,
      gameweekDeadline: deadline,
    },
  });

  emitTournamentUpdate(id, tournament.slug);
  return NextResponse.json({ currentGameweek: updated.currentGameweek, gameweekDeadline: updated.gameweekDeadline });
}
