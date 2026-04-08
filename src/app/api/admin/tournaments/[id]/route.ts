import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("MANAGE_TOURNAMENTS");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      matches: {
        include: {
          player1: { select: { id: true, username: true, displayName: true } },
          player2: { select: { id: true, username: true, displayName: true } },
        },
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ tournament });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("MANAGE_TOURNAMENTS");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const {
    name,
    slug,
    game,
    type,
    status,
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
  } = body;

  if (slug && slug !== existing.slug) {
    const slugTaken = await prisma.tournament.findUnique({ where: { slug } });
    if (slugTaken) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
  }

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(slug != null && { slug }),
      ...(game != null && { game }),
      ...(type != null && { type }),
      ...(status != null && { status }),
      ...(maxParticipants != null && { maxParticipants: Number(maxParticipants) }),
      ...(requiresPayment != null && { requiresPayment }),
      ...(entryFee != null && { entryFee: requiresPayment ? entryFee : 0 }),
      ...(prizePool != null && { prizePool }),
      ...(currency != null && { currency }),
      ...(description !== undefined && { description }),
      ...(rules !== undefined && { rules }),
      ...(imageKey !== undefined && { imageKey }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
  });

  emitTournamentUpdate(tournament.id, tournament.slug);
  return NextResponse.json({ tournament });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("MANAGE_TOURNAMENTS");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.tournament.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
