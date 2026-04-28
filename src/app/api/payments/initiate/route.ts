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

  // For wallet deposits, always use the authenticated user's ID as the entity
  // so users cannot deposit into another user's wallet by spoofing entityId
  const resolvedEntityId = purpose === "wallet_deposit" ? session.user.id : entityId;
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
