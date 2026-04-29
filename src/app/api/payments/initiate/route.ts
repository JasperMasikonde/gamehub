import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateSTKPush, normalisePhone } from "@/lib/ncba";

export async function POST(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!dbUser?.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before making a payment." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { phone, amount, purpose, entityId, metadata } = body;

  if (!phone || !amount || !purpose || !entityId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["escrow", "challenge", "challenge_host", "tournament", "shop", "rank_push", "wallet_deposit"].includes(purpose)) {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  // For wallet deposits, server enforces entityId — client cannot deposit into another user's wallet
  const resolvedEntityId = purpose === "wallet_deposit" ? session.user.id : (entityId as string);
  if (!resolvedEntityId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let normPhone: string;
  try {
    normPhone = normalisePhone(phone);
  } catch {
    return NextResponse.json({ error: "Invalid Kenyan phone number. Use 07XXXXXXXX format." }, { status: 400 });
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // ── Challenge-specific validation ─────────────────────────────────────────
  // Verify the amount matches the actual wager stored server-side, and that
  // the challenge is in the correct state, so a user cannot underpay.
  if (purpose === "challenge") {
    const challenge = await prisma.challenge.findUnique({
      where: { id: resolvedEntityId },
      select: { wagerAmount: true, status: true, hostId: true },
    });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    if (challenge.status !== "OPEN") {
      return NextResponse.json({ error: "This challenge is no longer open" }, { status: 400 });
    }
    if (challenge.hostId === session.user.id) {
      return NextResponse.json({ error: "You cannot join your own challenge" }, { status: 400 });
    }
    const expectedWager = Number(challenge.wagerAmount);
    if (Math.abs(amountNum - expectedWager) > 0.01) {
      return NextResponse.json(
        { error: `Amount must match the challenge wager (KES ${expectedWager.toLocaleString("en-KE", { minimumFractionDigits: 2 })})` },
        { status: 400 }
      );
    }
  }

  if (purpose === "challenge_host") {
    const challenge = await prisma.challenge.findUnique({
      where: { id: resolvedEntityId },
      select: { wagerAmount: true, status: true, hostId: true },
    });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    if (challenge.status !== "PENDING_HOST_PAYMENT") {
      return NextResponse.json({ error: "Challenge is not awaiting host payment" }, { status: 400 });
    }
    if (challenge.hostId !== session.user.id) {
      return NextResponse.json({ error: "Not your challenge" }, { status: 403 });
    }
    const expectedWager = Number(challenge.wagerAmount);
    if (Math.abs(amountNum - expectedWager) > 0.01) {
      return NextResponse.json(
        { error: `Amount must match the challenge wager (KES ${expectedWager.toLocaleString("en-KE", { minimumFractionDigits: 2 })})` },
        { status: 400 }
      );
    }
  }

  // ── Idempotency: return existing pending payment for the same entity ───────
  // Prevents multiple STK pushes for the same payment by returning the
  // in-progress payment record instead of creating a duplicate.
  const existing = await prisma.payment.findFirst({
    where: {
      userId: session.user.id,
      entityId: resolvedEntityId,
      purpose,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });
  if (existing) {
    return NextResponse.json({ paymentId: existing.id, message: "Payment already in progress" });
  }

  // Build a short reference (NCBA max 20 chars)
  const accountRef = `GH${purpose.slice(0, 4).toUpperCase()}${resolvedEntityId.slice(-8)}`;

  try {
    const stkRes = await initiateSTKPush(normPhone, amountNum, accountRef);

    if (!stkRes.TransactionID) {
      return NextResponse.json(
        { error: stkRes.ResponseDesc ?? "Failed to initiate STK push" },
        { status: 502 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: amountNum,
        phone: normPhone,
        ncbaTransactionId: stkRes.TransactionID,
        referenceId: accountRef,
        status: "PENDING",
        purpose,
        entityId: resolvedEntityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({ paymentId: payment.id, message: stkRes.ResponseDesc ?? "STK push sent" });
  } catch (err) {
    console.error("[payments/initiate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 502 }
    );
  }
}
