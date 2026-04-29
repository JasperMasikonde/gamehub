import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitChallengeMessage, emitToast, emitNewMessage } from "@/lib/socket-server";

const sendSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MATCH_CODE_REQUEST") }),
  z.object({ type: z.literal("MATCH_CODE"), code: z.string().min(1).max(200).trim() }),
  z.object({ type: z.literal("EFOOTBALL_USERNAME_REQUEST") }),
  z.object({ type: z.literal("EFOOTBALL_USERNAME"), username: z.string().min(1).max(100).trim() }),
  z.object({ type: z.literal("EFOOTBALL_QUICK_REPLY"), key: z.enum(["USERNAME_WRONG", "ACCEPT_FRIEND_REQUEST", "FRIEND_REQUEST_SENT"]) }),
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
  let content = "";
  if (messageType === "MATCH_CODE") content = parsed.data.code;
  else if (messageType === "EFOOTBALL_USERNAME") content = parsed.data.username;
  else if (messageType === "EFOOTBALL_QUICK_REPLY") content = parsed.data.key;

  // Validate match code format against the admin-configured pattern
  if (messageType === "MATCH_CODE") {
    const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
    const pattern = config?.matchCodePattern ?? "^\\d{4}-?\\d{4}$";
    const hint = config?.matchCodeHint ?? "8 digits, e.g. 12345678 or 1234-5678";
    try {
      if (!new RegExp(pattern).test(content)) {
        return NextResponse.json(
          { error: `Invalid match code format. Expected: ${hint}` },
          { status: 400 }
        );
      }
    } catch {
      // If the stored regex is somehow broken, skip validation
    }
  }

  const recipientId = isHost ? challenge.challengerId! : challenge.hostId;
  const senderName = session.user.username;

  const QUICK_REPLY_LABELS: Record<string, string> = {
    USERNAME_WRONG: "That username is wrong",
    ACCEPT_FRIEND_REQUEST: "Please accept my friend request",
    FRIEND_REQUEST_SENT: "Friend request sent",
  };

  const inboxContent =
    messageType === "MATCH_CODE"
      ? `[challenge:${id}] Match code: ${content}`
      : messageType === "EFOOTBALL_USERNAME"
      ? `[challenge:${id}] eFootball username: ${content}`
      : messageType === "EFOOTBALL_USERNAME_REQUEST"
      ? `[challenge:${id}] ${senderName} is asking for your eFootball username`
      : messageType === "EFOOTBALL_QUICK_REPLY"
      ? `[challenge:${id}] ${QUICK_REPLY_LABELS[content] ?? content}`
      : `[challenge:${id}] ${senderName} is requesting your match code`;

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
    prisma.message.create({
      data: { senderId: session.user.id, recipientId, content: inboxContent },
    }),
  ]);

  // Real-time: push to challenge room
  emitChallengeMessage(id, {
    id: message.id,
    senderId: message.senderId,
    senderUsername: message.sender.displayName ?? message.sender.username,
    messageType: message.messageType,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });

  // Toast for recipient (skip for quick replies — they're contextual in-chat)
  const toastTitle =
    messageType === "MATCH_CODE"
      ? `${senderName} shared their match code`
      : messageType === "EFOOTBALL_USERNAME"
      ? `${senderName} shared their eFootball username`
      : messageType === "EFOOTBALL_USERNAME_REQUEST"
      ? `${senderName} is asking for your eFootball username`
      : messageType === "EFOOTBALL_QUICK_REPLY"
      ? null
      : `${senderName} is requesting your match code`;

  if (toastTitle) {
    const toastBody =
      messageType === "MATCH_CODE" ? "Open the challenge to see the code"
      : messageType === "EFOOTBALL_USERNAME" ? "Open the challenge to see their username"
      : messageType === "EFOOTBALL_USERNAME_REQUEST" ? "Share your eFootball username in the chat"
      : "Share your code in the challenge chat";
    emitToast(recipientId, {
      type: "info",
      title: toastTitle,
      message: toastBody,
      linkUrl: `/challenges/${id}`,
      linkLabel: "Open chat →",
      duration: 8000,
    });
    emitNewMessage(recipientId, {
      messageId: message.id,
      senderId: session.user.id,
      senderUsername: senderName,
      content: toastTitle,
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
