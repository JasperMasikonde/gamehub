import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateSTKPush, normalisePhone } from "@/lib/ncba";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { phone, amount, purpose, entityId, metadata } = body;

  if (!phone || !amount || !purpose || !entityId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["escrow", "challenge", "challenge_host", "tournament", "shop"].includes(purpose)) {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
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
  const accountRef = `GH-${purpose.slice(0, 4).toUpperCase()}-${entityId.slice(-8)}`;

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
        entityId,
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
