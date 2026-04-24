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
    requiresPayment,
    entryFee,
    prizePool,
    currency,
    description,
    rules,
    imageKey,
    startDate,
    endDate,
    homeAndAway,
    groupCount,
    groupsAdvance,
  } = body;

  if (!name || !slug || !game || !type || !maxParticipants) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["LEAGUE", "KNOCKOUT", "CHAMPIONS_LEAGUE"].includes(type)) {
    return NextResponse.json({ error: "Invalid tournament type" }, { status: 400 });
  }

  if (type === "CHAMPIONS_LEAGUE" && (!groupCount || groupCount < 2)) {
    return NextResponse.json({ error: "Champions League requires at least 2 groups" }, { status: 400 });
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
      requiresPayment: requiresPayment ?? false,
      entryFee: requiresPayment ? (entryFee ?? 0) : 0,
      prizePool: prizePool ?? 0,
      currency: currency ?? "KES",
      description: description ?? null,
      rules: rules ?? null,
      imageKey: imageKey ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      homeAndAway: homeAndAway ?? false,
      groupCount: type === "CHAMPIONS_LEAGUE" ? Number(groupCount) : null,
      groupsAdvance: type === "CHAMPIONS_LEAGUE" ? Number(groupsAdvance ?? 2) : null,
      phase: type === "CHAMPIONS_LEAGUE" ? "GROUP" : null,
    },
  });

  emitTournamentUpdate(tournament.id, tournament.slug);
  return NextResponse.json({ tournament }, { status: 201 });
}
