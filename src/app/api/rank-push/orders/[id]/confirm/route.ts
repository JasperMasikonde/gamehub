import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitToast } from "@/lib/socket-server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.rankPushOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Order must be in DELIVERED state to confirm" }, { status: 400 });
  }

  const updated = await prisma.rankPushOrder.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await createNotification(order.providerId, "RANK_PUSH_COMPLETED", {
    title: "Order completed — payment released!",
    body: "The client confirmed your rank push service. Payment will be processed.",
    linkUrl: `/dashboard/rank-push`,
  });

  emitToast(order.providerId, {
    type: "success",
    title: "Order confirmed!",
    message: "The client confirmed your service. Payment is on its way.",
    linkUrl: `/dashboard/rank-push`,
    linkLabel: "View orders →",
    duration: 10000,
  });

  return NextResponse.json({ order: updated });
}
