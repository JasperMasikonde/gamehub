import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requirePermission("MANAGE_RANK_PUSH");
  } catch (e) {
    return e as Response;
  }

  const { userId } = await params;
  const body = await req.json();
  const { isRankPusher } = body;

  if (typeof isRankPusher !== "boolean") {
    return NextResponse.json({ error: "isRankPusher must be a boolean" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isRankPusher },
    select: { id: true, username: true, isRankPusher: true },
  });

  return NextResponse.json({ user });
}
