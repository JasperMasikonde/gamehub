import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitChallengeMessage, emitToast, emitNewMessage } from "@/lib/socket-server";

const sendSchema = z.object({
  content: z.string().min(1).max(1000),
});

const LOCKED_STATUSES = ["COMPLETED", "DISPUTED", "CANCELLED"];

// GET /api/challenges/[id]/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParty =
    challenge.hostId === session.user.id ||
    challenge.challengerId === session.user.id ||
    session.user.role === "ADMIN";
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.challengeMessage.findMany({
    where: { challengeId: id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  return NextResponse.json({ messages });
}

// POST /api/challenges/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isHost = challenge.hostId === session.user.id;
  const isChallenger = challenge.challengerId === session.user.id;
  if (!isHost && !isChallenger)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (LOCKED_STATUSES.includes(challenge.status)) {
    return NextResponse.json(
      { error: "Chat is closed — the match results have been submitted." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

  const { content } = parsed.data;
  const recipientId = isHost ? challenge.challengerId! : challenge.hostId;

  const [message] = await Promise.all([
    prisma.challengeMessage.create({
      data: { challengeId: id, senderId: session.user.id, content },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    }),
    // Save to regular inbox — prefix encodes the challenge ID so inbox can link back
    prisma.message.create({
      data: {
        senderId: session.user.id,
        recipientId,
        content: `[challenge:${id}] ${content}`,
      },
    }),
  ]);

  const challengeLink = `/challenges/${id}`;

  // Real-time: push to challenge room
  emitChallengeMessage(id, {
    id: message.id,
    senderId: message.senderId,
    senderUsername: message.sender.username,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });

  // Toast + unread badge for recipient if they're not in the challenge room
  emitToast(recipientId, {
    type: "info",
    title: `${message.sender.displayName ?? message.sender.username}`,
    message: content.length > 60 ? content.slice(0, 57) + "…" : content,
    linkUrl: challengeLink,
    linkLabel: "Open chat →",
    duration: 6000,
  });

  // Increment unread count in the messages icon
  emitNewMessage(recipientId, {
    messageId: message.id,
    senderId: session.user.id,
    senderUsername: message.sender.username,
    content,
  });

  return NextResponse.json({ message }, { status: 201 });
}
