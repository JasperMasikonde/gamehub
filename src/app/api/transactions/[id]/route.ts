import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { TransactionStatus } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      listing: {
        include: { screenshots: { orderBy: { order: "asc" } } },
      },
      buyer: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      seller: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      dispute: true,
      review: true,
    },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isBuyer = transaction.buyerId === session.user.id;
  const isSeller = transaction.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isBuyer && !isSeller && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ transaction });
}

// Confirm payment (moves to IN_ESCROW) — in production this would be a webhook
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "confirm_payment" && transaction.buyerId === session.user.id) {
    const updated = await transitionTransaction(
      id,
      TransactionStatus.IN_ESCROW,
      session.user.id
    );
    return NextResponse.json({ transaction: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
