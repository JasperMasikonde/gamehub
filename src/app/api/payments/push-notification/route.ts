import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate, emitTournamentUpdate } from "@/lib/socket-server";

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
// Formula from NCBA docs:
// SHA256(secretKey + TransType + TransID + TransTime + TransAmount +
//        CreditAccount + BillRefNumber + Mobile + Name + "1")
// then Base64-encode the result
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

// ── Payload types ─────────────────────────────────────────────────────────────
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

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let payload: NCBAPushPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: "C2B00012", ResultDesc: "Invalid JSON" }, { status: 400 });
  }

  // 1. Authenticate — NCBA sends the username/password we registered with them
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
  const amount = parseFloat(payload.TransAmount ?? "0");

  if (!billRef || !transId) {
    return NextResponse.json({ ResultCode: "C2B00012", ResultDesc: "Missing TransID or BillRefNumber" }, { status: 400 });
  }

  // 3. Find the pending payment by referenceId (the account ref the customer typed)
  const payment = await prisma.payment.findFirst({
    where: {
      referenceId: billRef,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (!payment) {
    // Could be a payment not initiated via the app (direct paybill payment).
    // Acknowledge so NCBA doesn't retry — log it for manual review.
    console.log("[push-notification] Unknown ref, no pending payment:", { billRef, transId, amount });
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  // 4. Optional amount sanity check
  if (Math.abs(amount - Number(payment.amount)) > 1) {
    console.warn("[push-notification] Amount mismatch", { expected: payment.amount, received: amount });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: `Amount mismatch: expected ${payment.amount}, got ${amount}` },
    });
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  // 5. Mark completed and store the M-Pesa TransID
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "COMPLETED",
      ncbaTransactionId: transId,
    },
  });

  // 6. Fulfill the business action
  try {
    await fulfillPayment(payment.purpose, payment.entityId, payment.userId, payment.metadata ?? null);
  } catch (err) {
    console.error("[push-notification] fulfillPayment error:", err);
  }

  // NCBA requires this exact response to stop retrying
  return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
}

// ── Business fulfillment (same as callback) ───────────────────────────────────
async function fulfillPayment(
  purpose: string,
  entityId: string,
  userId: string,
  metadataJson: string | null
) {
  const metadata = metadataJson ? JSON.parse(metadataJson) : {};

  if (purpose === "escrow") {
    await transitionTransaction(entityId, "IN_ESCROW", userId);
    return;
  }

  if (purpose === "challenge") {
    const { challengerSquadUrl, hostId } = metadata as { challengerSquadUrl: string; hostId: string };
    await prisma.challenge.update({
      where: { id: entityId },
      data: { challengerId: userId, challengerSquadUrl, status: "ACTIVE" },
    });
    if (hostId) {
      await createNotification(hostId, "CHALLENGE_ACCEPTED", {
        title: "Challenge accepted!",
        body: "Your match challenge has been accepted.",
        linkUrl: `/challenges/${entityId}`,
      });
      emitToast(hostId, {
        type: "success",
        title: "Challenge accepted!",
        message: "Your opponent paid the wager and is ready to play.",
        linkUrl: `/challenges/${entityId}`,
        linkLabel: "Go to challenge →",
        duration: 10000,
      });
      emitChallengeUpdate(hostId, userId, entityId);
    }
    return;
  }

  if (purpose === "tournament") {
    const tournament = await prisma.tournament.findUnique({ where: { id: entityId } });
    if (!tournament) return;
    await prisma.tournamentParticipant.upsert({
      where: { tournamentId_userId: { tournamentId: entityId, userId } },
      create: { tournamentId: entityId, userId },
      update: {},
    });
    emitTournamentUpdate(entityId, tournament.slug);
    return;
  }

  if (purpose === "shop") {
    await prisma.shopOrder.update({
      where: { id: entityId },
      data: { status: "PAID" },
    });
    return;
  }
}
