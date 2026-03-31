import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { review: true },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (transaction.buyerId !== session.user.id)
    return NextResponse.json({ error: "Only the buyer can leave a review" }, { status: 403 });
  if (transaction.status !== "COMPLETED")
    return NextResponse.json({ error: "Transaction must be completed" }, { status: 400 });
  if (transaction.review)
    return NextResponse.json({ error: "Review already submitted" }, { status: 409 });

  const { rating, comment } = parsed.data;

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        transactionId: id,
        reviewerId: session.user.id,
        revieweeId: transaction.sellerId,
        rating,
        comment,
      },
    });

    // Recalculate seller's average rating
    const agg = await tx.review.aggregate({
      where: { revieweeId: transaction.sellerId },
      _avg: { rating: true },
    });
    await tx.user.update({
      where: { id: transaction.sellerId },
      data: { rating: agg._avg.rating },
    });

    return r;
  });

  return NextResponse.json({ review }, { status: 201 });
}
