import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { claimAndFulfill } from "@/lib/payment-fulfillment";

/**
 * NCBA Paybill-Level Push Notification endpoint
 *
 * NCBA POSTs here whenever ANY payment is made to the paybill/till,
 * including manual M-Pesa payments (customer types paybill + account ref).
 *
 * Give this URL to the bank: https://eshabiki.com/api/payments/push-notification
 *
 * Required env vars (you choose these, give them to NCBA):
 *   NCBA_PUSH_USERNAME   — username NCBA uses to call this endpoint
 *   NCBA_PUSH_PASSWORD   — password NCBA uses to call this endpoint
 *   NCBA_PUSH_SECRET_KEY — secret used to verify the hash in each notification
 */

// ── Hash verification ─────────────────────────────────────────────────────────
function verifyHash(payload: NCBAPushPayload, secretKey: string): boolean {
  const raw =
    secretKey +
    (payload.TransType ?? "") +
    (payload.TransID ?? "") +
    (payload.TransTime ?? "") +
    (payload.TransAmount ?? "") +
    (payload.AccountNr ?? payload.BusinessShortCode ?? "") +
    (payload.BillRefNumber ?? payload.Narrative ?? "") +
    (payload.PhoneNr ?? payload.Mobile ?? "") +
    (payload.CustomerName ?? payload.name ?? "") +
    "1";

  const expected = createHash("sha256").update(raw).digest("base64");
  return expected === (payload.SecretKey ?? payload.Hash ?? "");
}

interface NCBAPushPayload {
  TransType?: string;
  TransID?: string;
  FTRef?: string;
  TransTime?: string;
  TransAmount?: string;
  AccountNr?: string;
  BusinessShortCode?: string;
  BillRefNumber?: string;
  Narrative?: string;
  PhoneNr?: string;
  Mobile?: string;
  CustomerName?: string;
  name?: string;
  User?: string;
  Username?: string;
  Password?: string;
  SecretKey?: string;
  Hash?: string;
  Status?: string;
  created_at?: string;
}

export async function POST(req: NextRequest) {
  let payload: NCBAPushPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: "C2B00012", ResultDesc: "Invalid JSON" }, { status: 400 });
  }

  // 1. Authenticate
  const pushUsername = process.env.NCBA_PUSH_USERNAME;
  const pushPassword = process.env.NCBA_PUSH_PASSWORD;
  const secretKey = process.env.NCBA_PUSH_SECRET_KEY;

  if (pushUsername && pushPassword) {
    const incomingUser = payload.User ?? payload.Username ?? "";
    const incomingPass = payload.Password ?? "";
    if (incomingUser !== pushUsername || incomingPass !== pushPassword) {
      console.warn("[push-notification] Auth failed — wrong username/password");
      return NextResponse.json({ ResultCode: "C2B00012", ResultDesc: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Verify hash integrity
  if (secretKey) {
    if (!verifyHash(payload, secretKey)) {
      console.warn("[push-notification] Hash verification failed", { TransID: payload.TransID });
      return NextResponse.json({ ResultCode: "C2B00012", ResultDesc: "Invalid hash" }, { status: 401 });
    }
  }

  const billRef = payload.BillRefNumber ?? payload.Narrative ?? "";
  const transId = payload.TransID ?? "";
  const receivedAmount = parseFloat(payload.TransAmount ?? "0");

  if (!billRef || !transId) {
    return NextResponse.json({ ResultCode: "C2B00012", ResultDesc: "Missing TransID or BillRefNumber" }, { status: 400 });
  }

  // 3. Find the pending payment by referenceId
  const payment = await prisma.payment.findFirst({
    where: {
      referenceId: billRef,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (!payment) {
    console.log("[push-notification] Unknown ref, no pending payment:", { billRef, transId, receivedAmount });
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  // 4. Amount sanity check — reject if off by more than KES 1
  if (Math.abs(receivedAmount - Number(payment.amount)) > 1) {
    console.warn("[push-notification] Amount mismatch", { expected: payment.amount, received: receivedAmount });
    await prisma.payment.updateMany({
      where: { id: payment.id, status: { notIn: ["COMPLETED", "FAILED"] } },
      data: { status: "FAILED", failureReason: `Amount mismatch: expected ${payment.amount}, got ${receivedAmount}` },
    });
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  // 5. Store the M-Pesa TransID (informational — don't overwrite terminal status)
  await prisma.payment.updateMany({
    where: { id: payment.id, status: { notIn: ["COMPLETED", "FAILED"] } },
    data: { ncbaTransactionId: transId },
  });

  // 6. Atomically claim and fulfill
  await claimAndFulfill(payment);

  return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
}
