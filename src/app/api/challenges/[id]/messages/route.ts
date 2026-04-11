import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitChallengeMessage, emitToast, emitNewMessage } from "@/lib/socket-server";

const sendSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MATCH_CODE_REQUEST") }),
  z.object({ type: z.literal("MATCH_CODE"), code: z.string().min(1).max(200) }),
]);

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

  // Gate: both parties must have agreed on a match time before exchanging codes
  if (!challenge.scheduledAt) {
    return NextResponse.json(
      { error: "Agree on a match time first before exchanging match codes." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid message type" }, { status: 400 });
  }

  const messageType = parsed.data.type;
  const content = messageType === "MATCH_CODE" ? parsed.data.code : "";
  const recipientId = isHost ? challenge.challengerId! : challenge.hostId;
  const senderName = session.user.username;

  const [message] = await Promise.all([
    prisma.challengeMessage.create({
      data: {
        challengeId: id,
        senderId: session.user.id,
        messageType,
        content,
      },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    }),
    // Save a copy to the regular inbox for notification purposes
    prisma.message.create({
      data: {
        senderId: session.user.id,
        recipientId,
        content:
          messageType === "MATCH_CODE"
            ? `[challenge:${id}] Match code: ${content}`
            : `[challenge:${id}] ${senderName} is requesting your match code`,
      },
    }),
  ]);

  // Real-time: push to challenge room
  emitChallengeMessage(id, {
    id: message.id,
    senderId: message.senderId,
    senderUsername: message.sender.username,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });

  // Toast + unread for recipient
  const toastMessage =
    messageType === "MATCH_CODE"
      ? `${senderName} shared their match code`
      : `${senderName} is requesting your match code`;
  emitToast(recipientId, {
    type: "info",
    title: toastMessage,
    message: messageType === "MATCH_CODE" ? "Open the challenge to see the code" : "Share your code in the challenge chat",
    linkUrl: `/challenges/${id}`,
    linkLabel: "Open chat →",
    duration: 8000,
  });
  emitNewMessage(recipientId, {
    messageId: message.id,
    senderId: session.user.id,
    senderUsername: senderName,
    content: toastMessage,
  });

  return NextResponse.json({ message }, { status: 201 });
}
