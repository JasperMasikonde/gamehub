import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("SEND_SUPPORT_EMAIL");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = await prisma.supportEmail.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fromEmail: true,
      fromName: true,
      subject: true,
      bodyText: true,
      bodyHtml: true,
      isRead: true,
      repliedAt: true,
      createdAt: true,
    },
  });

  const unreadCount = await prisma.supportEmail.count({ where: { isRead: false } });

  return NextResponse.json({ emails, unreadCount });
}
