import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/messages/[userId]  — fetch conversation + mark incoming as read
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: otherUserId } = await params;
  const myId = session.user.id;

  const [messages, otherUser] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: myId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
    }),
  ]);

  if (!otherUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Mark all unread messages from the other user as read
  await prisma.message.updateMany({
    where: { senderId: otherUserId, recipientId: myId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ messages, otherUser });
}
