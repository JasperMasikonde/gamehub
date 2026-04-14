import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitWalletUpdate } from "@/lib/socket-server";
import { creditWallet } from "@/lib/wallet";

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

  // Credit provider's wallet with their earnings
  const walletTx = await creditWallet({
    userId: order.providerId,
    amount: Number(order.providerGets),
    type: "RANK_PUSH_CREDIT",
    description: `Rank push order #${order.id.slice(-8)} completed`,
  });
  emitWalletUpdate(order.providerId, Number(walletTx.balanceAfter));

  await createNotification(order.providerId, "RANK_PUSH_COMPLETED", {
    title: "Order completed — payment credited to wallet!",
    body: `The client confirmed your rank push service. KES ${Number(order.providerGets).toFixed(2)} has been added to your wallet.`,
    linkUrl: `/dashboard/wallet`,
  });

  emitToast(order.providerId, {
    type: "success",
    title: "Order confirmed! 💰",
    message: `KES ${Number(order.providerGets).toFixed(2)} credited to your wallet.`,
    linkUrl: `/dashboard/wallet`,
    linkLabel: "View wallet →",
    duration: 10000,
  });

  return NextResponse.json({ order: updated });
}
