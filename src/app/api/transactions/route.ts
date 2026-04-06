import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTransactionSchema } from "@/lib/validations/transaction";
import { transitionTransaction, calculateFees } from "@/lib/escrow";
import { TransactionStatus } from "@prisma/client";

export async function POST(req: Request) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { listingId } = parsed.data;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Listing not available" },
      { status: 400 }
    );
  }

  if (listing.sellerId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot buy your own listing" },
      { status: 400 }
    );
  }

  const siteConfig = await prisma.siteConfig.findUnique({
    where: { id: "singleton" },
  });
  const feeRate = Number(siteConfig?.platformFeeRate ?? 0.05);
  const price = Number(listing.price);
  const { platformFee, sellerReceives } = calculateFees(price, feeRate);

  // Create transaction and mark listing as SOLD atomically
  const transaction = await prisma.$transaction(async (tx) => {
    // Guard against race conditions
    const freshListing = await tx.listing.findUnique({
      where: { id: listingId },
    });
    if (!freshListing || freshListing.status !== "ACTIVE") {
      throw new Error("Listing no longer available");
    }

    await tx.listing.update({
      where: { id: listingId },
      data: { status: "SOLD" },
    });

    return tx.transaction.create({
      data: {
        listingId,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        amount: price,
        platformFee,
        sellerReceives,
        currency: listing.currency,
        status: TransactionStatus.PENDING_PAYMENT,
      },
    });
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
