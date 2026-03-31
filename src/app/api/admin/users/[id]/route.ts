import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserStatus } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      listings: { orderBy: { createdAt: "desc" }, take: 10 },
      purchases: { orderBy: { createdAt: "desc" }, take: 10 },
      sales: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const body = await req.json();
  const { action, note } = body as { action: string; note?: string };

  const actionMap: Record<string, { status?: UserStatus; isVerifiedSeller?: boolean; action: string }> = {
    ban: { status: "BANNED", action: "BAN_USER" },
    unban: { status: "ACTIVE", action: "UNBAN_USER" },
    verify_seller: { isVerifiedSeller: true, action: "VERIFY_SELLER" },
    unverify_seller: { isVerifiedSeller: false, action: "UNVERIFY_SELLER" },
  };

  const op = actionMap[action];
  if (!op) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { action: adminActionName, ...updateData } = op;
  await prisma.user.update({ where: { id }, data: updateData });
  await prisma.adminAction.create({
    data: { adminId: admin.id, targetUserId: id, action: adminActionName, note },
  });

  return NextResponse.json({ success: true });
}
