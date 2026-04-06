import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitNewMessage, emitToast } from "@/lib/socket-server";

// POST /api/admin/messages/[userId]  — admin sends a message to a user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await resolveSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId: recipientId } = await params;
  const { content, imageUrl } = await req.json();

  if ((typeof content !== "string" || !content.trim()) && !imageUrl) {
    return NextResponse.json({ error: "content or imageUrl is required" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, username: true },
  });
  if (!recipient) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      senderId: session.user.id,
      recipientId,
      content: typeof content === "string" ? content.trim() : "",
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  emitNewMessage(recipientId, {
    messageId: message.id,
    senderId: session.user.id,
    senderUsername: "Eshabiki Admin",
    content: content.trim(),
  });

  emitToast(recipientId, {
    type: "info",
    title: "New message from Eshabiki Admin",
    message: content.trim().slice(0, 80),
    linkUrl: `/messages/${session.user.id}`,
    linkLabel: "View message →",
  });

  return NextResponse.json({ message });
}
