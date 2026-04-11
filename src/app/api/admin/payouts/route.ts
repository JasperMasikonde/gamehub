import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("MANAGE_CHALLENGES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ requests });
}
