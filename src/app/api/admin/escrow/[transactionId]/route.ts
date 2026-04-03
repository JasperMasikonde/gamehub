import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { TransactionStatus } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;
  let admin;
  try {
    admin = await requirePermission("MANAGE_TRANSACTIONS");
  } catch {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const body = await req.json();
  const { action, note } = body as { action: "release" | "refund"; note?: string };

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newStatus =
    action === "release" ? TransactionStatus.COMPLETED : TransactionStatus.REFUNDED;

  const updated = await transitionTransaction(
    transactionId,
    newStatus,
    admin.id,
    note
  );

  await prisma.adminAction.create({
    data: {
      adminId: admin.id,
      transactionId,
      action: action === "release" ? "RELEASE_ESCROW" : "REFUND_ESCROW",
      note,
    },
  });

  return NextResponse.json({ transaction: updated });
}
