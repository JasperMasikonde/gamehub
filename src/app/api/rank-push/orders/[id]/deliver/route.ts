import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitToast } from "@/lib/socket-server";

export async function PATCH(
  req: NextRequest,
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
  if (order.providerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Order is not in progress" }, { status: 400 });
  }

  const body = await req.json();
  const { deliveryNote } = body;

  const updated = await prisma.rankPushOrder.update({
    where: { id },
    data: { status: "DELIVERED", deliveryNote: deliveryNote ?? null },
  });

  await createNotification(order.clientId, "RANK_PUSH_DELIVERED", {
    title: "Your rank push is done!",
    body: "The provider has marked your order as delivered. Please confirm or dispute.",
    linkUrl: `/dashboard/rank-push`,
  });

  emitToast(order.clientId, {
    type: "success",
    title: "Rank push delivered!",
    message: "Your provider marked the service as done. Confirm to release payment.",
    linkUrl: `/dashboard/rank-push`,
    linkLabel: "View order →",
    duration: 10000,
  });

  return NextResponse.json({ order: updated });
}
