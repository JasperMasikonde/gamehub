import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/messages/[userId]/read  — mark all messages from userId as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: senderId } = await params;

  await prisma.message.updateMany({
    where: { senderId, recipientId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
