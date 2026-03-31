import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { _count: { select: { participants: true } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.status !== "REGISTRATION_OPEN")
    return NextResponse.json({ error: "Registration is not open" }, { status: 400 });
  if (tournament._count.participants >= tournament.maxParticipants)
    return NextResponse.json({ error: "Tournament is full" }, { status: 400 });

  const existing = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId: tournament.id, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already registered" }, { status: 409 });

  const participant = await prisma.tournamentParticipant.create({
    data: { tournamentId: tournament.id, userId: session.user.id },
  });
  return NextResponse.json({ participant }, { status: 201 });
}
