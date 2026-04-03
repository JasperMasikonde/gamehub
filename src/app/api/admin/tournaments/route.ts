import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

export async function GET() {
  try {
    await requirePermission("MANAGE_TOURNAMENTS");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true, matches: true } },
    },
  });

  return NextResponse.json({ tournaments });
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("MANAGE_TOURNAMENTS");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    slug,
    game,
    type,
    maxParticipants,
    entryFee,
    prizePool,
    currency,
    description,
    rules,
    imageKey,
    startDate,
    endDate,
  } = body;

  if (!name || !slug || !game || !type || !maxParticipants) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["LEAGUE", "KNOCKOUT"].includes(type)) {
    return NextResponse.json({ error: "Invalid tournament type" }, { status: 400 });
  }

  const existing = await prisma.tournament.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const tournament = await prisma.tournament.create({
    data: {
      name,
      slug,
      game,
      type,
      maxParticipants: Number(maxParticipants),
      entryFee: entryFee ?? 0,
      prizePool: prizePool ?? 0,
      currency: currency ?? "KES",
      description: description ?? null,
      rules: rules ?? null,
      imageKey: imageKey ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  emitTournamentUpdate(tournament.id, tournament.slug);
  return NextResponse.json({ tournament }, { status: 201 });
}
