import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
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
