import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { TransactionStatus } from "@prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
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
      { error: "Credentials have not been delivered yet" },
      { status: 400 }
    );
  }

  const updated = await transitionTransaction(
    id,
    TransactionStatus.COMPLETED,
    session.user.id
  );

  // Update user stats
  await prisma.$transaction([
    prisma.user.update({
      where: { id: transaction.buyerId },
      data: { totalPurchases: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: transaction.sellerId },
      data: { totalSales: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ transaction: updated });
}
