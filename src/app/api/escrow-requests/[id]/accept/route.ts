import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFees } from "@/lib/escrow";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitEscrowRequestUpdate } from "@/lib/socket-server";
import { z } from "zod";

const acceptSchema = z.object({
  sellerScreenshots: z.array(z.string()).optional(),
});

// POST /api/escrow-requests/[id]/accept — counterparty accepts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const escrowReq = await prisma.escrowRequest.findUnique({ where: { id } });
  if (!escrowReq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (escrowReq.counterpartyId !== session.user.id)
    return NextResponse.json({ error: "Only the counterparty can accept" }, { status: 403 });
  if (escrowReq.status !== "PENDING")
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 });

  // Counterparty is seller when initiator is buyer
  const counterpartyIsSeller = escrowReq.initiatorRole === "BUYER";

  // If counterparty is seller, require screenshots (unless initiator already uploaded them)
  const body = await req.json().catch(() => ({}));
  const { sellerScreenshots } = acceptSchema.parse(body);

  if (counterpartyIsSeller) {
    const existingScreenshots = escrowReq.sellerScreenshots ?? [];
    const newScreenshots = sellerScreenshots ?? [];
    const total = existingScreenshots.length + newScreenshots.length;
    if (total < 4) {
      return NextResponse.json(
        { error: "You must upload at least 4 account screenshots (username, squad, reserves, managers) before accepting" },
        { status: 400 }
      );
    }
  }

  // Determine buyer / seller based on initiator's role
  const buyerId =
    escrowReq.initiatorRole === "BUYER" ? escrowReq.initiatorId : escrowReq.counterpartyId;
  const sellerId =
    escrowReq.initiatorRole === "SELLER" ? escrowReq.initiatorId : escrowReq.counterpartyId;

  const siteConfig = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  const feeRate = Number(siteConfig?.platformFeeRate ?? 0.05);
  const price = Number(escrowReq.price);
  const { platformFee, sellerReceives } = calculateFees(price, feeRate);

  // Create private listing + transaction atomically
  const { listing, transaction } = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.create({
      data: {
        sellerId,
        title: escrowReq.title,
        description: escrowReq.description,
        price: escrowReq.price,
        currency: escrowReq.currency,
        status: "ACTIVE",
        isPrivateDeal: true,
        approvedAt: new Date(),
        approvedBy: "escrow_request",
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId,
        amount: price,
        platformFee,
        sellerReceives,
        currency: escrowReq.currency,
      },
    });

    // Merge any new seller screenshots from the counterparty
    const mergedScreenshots = [
      ...(escrowReq.sellerScreenshots ?? []),
      ...(sellerScreenshots ?? []),
    ];

    await tx.escrowRequest.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        transactionId: transaction.id,
        sellerScreenshots: mergedScreenshots,
      },
    });

    // Mark listing as sold now that transaction exists
    await tx.listing.update({
      where: { id: listing.id },
      data: { status: "SOLD" },
    });

    return { listing, transaction };
  });

  const escrowLink = `/dashboard/escrow/${transaction.id}`;

  // Notify initiator
  await createNotification(escrowReq.initiatorId, "ESCROW_REQUEST_ACCEPTED", {
    title: "Escrow request accepted!",
    body: `Your escrow deal "${escrowReq.title}" has been accepted. Proceed to payment.`,
    linkUrl: escrowLink,
  });
  emitToast(escrowReq.initiatorId, {
    type: "success",
    title: "Escrow request accepted!",
    message: `"${escrowReq.title}" — proceed to payment to start the escrow.`,
    linkUrl: escrowLink,
    linkLabel: "Go to escrow →",
    duration: 10000,
  });

  emitEscrowRequestUpdate(escrowReq.initiatorId, escrowReq.counterpartyId, id);

  return NextResponse.json({ transaction, listing });
}
