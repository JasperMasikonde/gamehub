import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitOrderUpdate, emitToast } from "@/lib/socket-server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, displayName: true, email: true } },
      items: { include: { product: { select: { name: true, imageKeys: true, slug: true } } } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { status } = await req.json();
  const validStatuses = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  if (!validStatuses.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const order = await prisma.shopOrder.update({
    where: { id },
    data: { status },
    include: { user: { select: { id: true } } },
  });
  emitOrderUpdate(order.user.id, order.id);
  emitToast(order.user.id, { type: "info", title: "Order Updated", message: `Your order status changed to ${status.replace(/_/g, " ").toLowerCase()}.` });
  return NextResponse.json({ order });
}
