import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("MANAGE_CHALLENGES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Lightweight count-only mode for the dashboard badge
  if (req.nextUrl.searchParams.get("count") === "true") {
    const [pending, approved] = await Promise.all([
      prisma.payoutRequest.count({ where: { status: "PENDING" } }),
      prisma.payoutRequest.count({ where: { status: "APPROVED" } }),
    ]);
    return NextResponse.json({ pending, approved, actionable: pending + approved });
  }

  const requests = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ requests });
}
