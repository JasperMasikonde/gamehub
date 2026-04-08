import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("MANAGE_RANK_PUSH");
  } catch (e) {
    return e as Response;
  }

  const providers = await prisma.user.findMany({
    where: { isRankPusher: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      email: true,
      status: true,
      isRankPusher: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ providers });
}
