import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { creditWallet } from "@/lib/wallet";
import { emitToast } from "@/lib/socket-server";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  action: z.enum(["approve", "reject", "mark_paid"]),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let admin;
  try {
    admin = await requirePermission("MANAGE_CHALLENGES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { action, adminNote } = parsed.data;

  const payout = await prisma.payoutRequest.findUnique({ where: { id } });
  if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    if (payout.status !== "PENDING")
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 });

    await prisma.payoutRequest.update({
      where: { id },
      data: { status: "APPROVED", adminNote, processedBy: admin.id, processedAt: new Date() },
    });

    await createNotification(payout.userId, "PAYOUT_APPROVED", {
      title: "Payout approved",
      body: `Your payout request of KES ${payout.amount} has been approved and will be sent shortly.`,
      linkUrl: "/dashboard/wallet",
    });
    emitToast(payout.userId, {
      type: "success",
      title: "Payout approved!",
      message: `KES ${payout.amount} will be sent to ${payout.phone} shortly.`,
      duration: 8000,
    });

    return NextResponse.json({ success: true });
  }

  if (action === "mark_paid") {
    if (payout.status !== "APPROVED" && payout.status !== "PENDING")
      return NextResponse.json({ error: "Cannot mark a paid or rejected request as paid" }, { status: 400 });

    await prisma.payoutRequest.update({
      where: { id },
      data: { status: "PAID", adminNote, processedBy: admin.id, processedAt: new Date() },
    });

    await createNotification(payout.userId, "PAYOUT_PAID", {
      title: "Payout sent!",
      body: `KES ${payout.amount} has been sent to ${payout.phone}.`,
      linkUrl: "/dashboard/wallet",
    });
    emitToast(payout.userId, {
      type: "success",
      title: "Payout sent!",
      message: `KES ${payout.amount} has been sent to ${payout.phone}.`,
      duration: 10000,
    });

    return NextResponse.json({ success: true });
  }

  // action === "reject"
  if (payout.status !== "PENDING" && payout.status !== "APPROVED")
    return NextResponse.json({ error: "Cannot reject a paid/already rejected request" }, { status: 400 });

  // Refund the wallet balance that was debited when the request was created
  await creditWallet({
    userId: payout.userId,
    amount: Number(payout.amount),
    type: "ADMIN_ADJUSTMENT",
    description: `Payout request rejected — refund KES ${Number(payout.amount).toFixed(2)}`,
    payoutId: id,
  });

  await prisma.payoutRequest.update({
    where: { id },
    data: { status: "REJECTED", adminNote, processedBy: admin.id, processedAt: new Date() },
  });

  await createNotification(payout.userId, "PAYOUT_REJECTED", {
    title: "Payout request rejected",
    body: `Your payout of KES ${payout.amount} was rejected. The amount has been returned to your wallet.${adminNote ? ` Note: ${adminNote}` : ""}`,
    linkUrl: "/dashboard/wallet",
  });
  emitToast(payout.userId, {
    type: "warning",
    title: "Payout rejected",
    message: `KES ${payout.amount} returned to your wallet.${adminNote ? ` Reason: ${adminNote}` : ""}`,
    duration: 10000,
  });

  return NextResponse.json({ success: true });
}
