import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentUpdate } from "@/lib/socket-server";
import { sendTournamentOpenEmail } from "@/lib/email";

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
    privateDescription,
    rules,
    imageKey,
    startDate,
    endDate,
    homeAndAway,
    groupCount,
    groupsAdvance,
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
      ...(privateDescription !== undefined && { privateDescription }),
      ...(rules !== undefined && { rules }),
      ...(imageKey !== undefined && { imageKey }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(homeAndAway != null && { homeAndAway }),
      ...(groupCount != null && { groupCount: Number(groupCount) }),
      ...(groupsAdvance != null && { groupsAdvance: Number(groupsAdvance) }),
    },
  });

  emitTournamentUpdate(tournament.id, tournament.slug);

  // If status just changed to REGISTRATION_OPEN, blast all users
  if (status === "REGISTRATION_OPEN" && existing.status !== "REGISTRATION_OPEN") {
    const users = await prisma.user.findMany({
      where: { email: { not: undefined } },
      select: { email: true, displayName: true, username: true },
    });

    // Fire and forget — don't block the response
    void Promise.allSettled(
      users.map(u =>
        sendTournamentOpenEmail({
          toEmail: u.email!,
          toName: u.displayName ?? u.username,
          tournamentName: tournament.name,
          game: tournament.game,
          slug: tournament.slug,
          entryFee: Number(tournament.entryFee),
          prizePool: Number(tournament.prizePool),
          startDate: tournament.startDate,
        })
      )
    );
  }

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
