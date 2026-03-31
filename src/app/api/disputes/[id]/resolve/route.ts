import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { resolveDisputeSchema } from "@/lib/validations/transaction";
import { TransactionStatus } from "@prisma/client";

export async function POST(
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

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { transaction: true },
  });
  if (!dispute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = resolveDisputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { resolution, outcome } = parsed.data;
  const newTxStatus =
    outcome === "BUYER" ? TransactionStatus.REFUNDED : TransactionStatus.COMPLETED;

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id },
      data: {
        status: outcome === "BUYER" ? "RESOLVED_BUYER" : "RESOLVED_SELLER",
        resolution,
        resolvedBy: admin.id,
        resolvedAt: new Date(),
      },
    });

    await tx.adminAction.create({
      data: {
        adminId: admin.id,
        transactionId: dispute.transactionId,
        action: `RESOLVE_DISPUTE_${outcome}`,
        note: resolution,
      },
    });
  });

  const updated = await transitionTransaction(
    dispute.transactionId,
    newTxStatus,
    admin.id,
    resolution
  );

  return NextResponse.json({ transaction: updated });
}
