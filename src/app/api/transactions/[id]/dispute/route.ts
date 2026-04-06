import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { raiseDisputeSchema } from "@/lib/validations/transaction";
import { TransactionStatus } from "@prisma/client";
import { getPublicUrl } from "@/lib/gcs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (transaction.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (transaction.status !== TransactionStatus.DELIVERED) {
    return NextResponse.json(
      { error: "Can only dispute after credentials are delivered" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = raiseDisputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reason, evidenceKeys = [] } = parsed.data;

  await prisma.dispute.create({
    data: {
      transactionId: id,
      raisedById: session.user.id,
      reason,
      evidence: evidenceKeys.map((k) => getPublicUrl(k)),
    },
  });

  const updated = await transitionTransaction(
    id,
    TransactionStatus.DISPUTED,
    session.user.id
  );

  return NextResponse.json({ transaction: updated });
}
