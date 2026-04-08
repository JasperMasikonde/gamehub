import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate, emitTournamentUpdate } from "@/lib/socket-server";

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

  // NCBA callback payload fields
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
    // Unknown transaction — acknowledge so NCBA doesn't retry
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  // Skip if already finalised
  if (payment.status === "COMPLETED" || payment.status === "FAILED") {
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  if (resultCode === "0") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });

    try {
      await fulfillPayment(payment.purpose, payment.entityId, payment.userId, payment.metadata ?? null);
    } catch (err) {
      console.error("[payments/callback] fulfillPayment error:", err);
    }
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: resultDesc ?? `ResultCode ${resultCode}` },
    });
  }

  // NCBA expects this acknowledgement format
  return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
}

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

  if (purpose === "challenge_host") {
    await prisma.challenge.update({
      where: { id: entityId },
      data: { status: "OPEN" },
    });
    emitChallengeUpdate(userId, null, entityId);
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
        body: "Your match challenge has been accepted. Head to the challenge room.",
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
