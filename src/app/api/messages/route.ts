import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitNewMessage, emitToast } from "@/lib/socket-server";

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

// GET /api/messages
// ?unread=true  → returns { unreadCount }
// otherwise     → returns { conversations }
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

  if (unreadOnly) {
    const unreadCount = await prisma.message.count({
      where: { recipientId: userId, isRead: false },
    });
    return NextResponse.json({ unreadCount });
  }

  // Fetch all messages involving the user, newest first
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    include: { sender: { select: USER_SELECT }, recipient: { select: USER_SELECT } },
  });

  // Group into conversations by the other party's ID
  const convMap = new Map<
    string,
    {
      partner: typeof messages[0]["sender"];
      latestMessage: typeof messages[0];
      unreadCount: number;
    }
  >();

  for (const msg of messages) {
    const isOutgoing = msg.senderId === userId;
    const partnerId = isOutgoing ? msg.recipientId : msg.senderId;
    const partner = isOutgoing ? msg.recipient : msg.sender;

    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, { partner, latestMessage: msg, unreadCount: 0 });
    }
    if (!isOutgoing && !msg.isRead) {
      convMap.get(partnerId)!.unreadCount++;
    }
  }

  const conversations = Array.from(convMap.values()).sort(
    (a, b) =>
      new Date(b.latestMessage.createdAt).getTime() -
      new Date(a.latestMessage.createdAt).getTime()
  );

  return NextResponse.json({ conversations });
}

// POST /api/messages  — send a message
// body: { recipientId, content }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId, content, imageUrl } = await req.json();

  if (!recipientId || (typeof content !== "string" && !imageUrl)) {
    return NextResponse.json({ error: "recipientId and content or imageUrl are required" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, username: true },
  });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      senderId: session.user.id,
      recipientId,
      content: typeof content === "string" ? content.trim() : "",
      ...(imageUrl ? { imageUrl } : {}),
    },
    include: { sender: { select: USER_SELECT } },
  });

  // Real-time push to recipient
  emitNewMessage(recipientId, {
    messageId: message.id,
    senderId: session.user.id,
    senderUsername: session.user.username ?? session.user.email ?? "Someone",
    content: content.trim(),
  });

  // Toast notification for recipient
  emitToast(recipientId, {
    type: "info",
    title: `New message from ${session.user.username ?? "Someone"}`,
    message: content.trim().slice(0, 80),
    linkUrl: `/messages/${session.user.id}`,
    linkLabel: "Reply →",
  });

  return NextResponse.json({ message });
}
