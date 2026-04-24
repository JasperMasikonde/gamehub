import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitTournamentMessage } from "@/lib/socket-server";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, participants: { where: { userId: session.user.id }, select: { id: true } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.participants.length === 0) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const messages = await prisma.tournamentMessage.findMany({
    where: { tournamentId: tournament.id },
    include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, slug: true, participants: { where: { userId: session.user.id }, select: { id: true } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.participants.length === 0) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const body = await req.json() as { content?: string; imageUrl?: string };
  if (!body.content?.trim() && !body.imageUrl) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, displayName: true },
  });
  if (!sender) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const message = await prisma.tournamentMessage.create({
    data: {
      tournamentId: tournament.id,
      senderId: session.user.id,
      content: body.content?.trim() ?? "",
      imageUrl: body.imageUrl ?? null,
    },
    include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  emitTournamentMessage(slug, {
    id: message.id,
    senderId: sender.id,
    senderUsername: sender.username,
    senderDisplayName: sender.displayName,
    content: message.content,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt.toISOString(),
  });

  return NextResponse.json({ message });
}
