import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimAndFulfill } from "@/lib/payment-fulfillment";

/**
 * NCBA C2B Callback
 * NCBA POSTs payment results here after STK push completes.
 * Give this URL to the bank: https://eshabiki.com/api/payments/callback
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transactionId = body.TransactionID as string | undefined;
  const resultCode = String(body.ResultCode ?? body.ResponseCode ?? "");
  const resultDesc = body.ResultDesc as string | undefined;

  if (!transactionId) {
    return NextResponse.json({ ResultCode: "C2B00012", ResultDesc: "Invalid TransactionID" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { ncbaTransactionId: transactionId },
  });

  if (!payment) {
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  // Already in a terminal state — idempotent early return
  if (payment.status === "COMPLETED" || payment.status === "FAILED") {
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  if (resultCode === "0") {
    await claimAndFulfill(payment);
  } else {
    // Atomically mark FAILED only if not already terminal
    await prisma.payment.updateMany({
      where: { id: payment.id, status: { notIn: ["COMPLETED", "FAILED"] } },
      data: { status: "FAILED", failureReason: resultDesc ?? `ResultCode ${resultCode}` },
    });
  }

  return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
}
