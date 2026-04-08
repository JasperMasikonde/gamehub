import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { listingId, squadUrl, notes } = body;

  if (!listingId || !squadUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const listing = await prisma.rankPushListing.findUnique({
    where: { id: listingId },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json({ error: "Listing not available" }, { status: 400 });
  }

  if (listing.providerId === session.user.id) {
    return NextResponse.json({ error: "You cannot order your own service" }, { status: 400 });
  }

  const siteConfig = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  const feeRate = Number(siteConfig?.platformFeeRate ?? 0.05);
  const amount = Number(listing.price);
  const platformFee = Math.round(amount * feeRate * 100) / 100;
  const providerGets = Math.round((amount - platformFee) * 100) / 100;

  const order = await prisma.rankPushOrder.create({
    data: {
      listingId,
      clientId: session.user.id,
      providerId: listing.providerId,
      squadUrl,
      amount,
      platformFee,
      providerGets,
      currency: listing.currency,
      status: "PENDING_PAYMENT",
      notes: notes ?? null,
    },
  });

  return NextResponse.json({ order }, { status: 201 });
}
