import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate, emitTournamentUpdate } from "@/lib/socket-server";
import { creditWallet } from "@/lib/wallet";

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

  if (payment.status === "COMPLETED" || payment.status === "FAILED") {
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
  }

  if (resultCode === "0") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });

    try {
      await fulfillPayment(
        payment.purpose,
        payment.entityId,
        payment.userId,
        Number(payment.amount),
        payment.metadata ?? null,
      );
    } catch (err) {
      console.error("[payments/callback] fulfillPayment error:", err);
    }
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: resultDesc ?? `ResultCode ${resultCode}` },
    });
  }

  return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
}

async function fulfillPayment(
  purpose: string,
  entityId: string,
  userId: string,
  amount: number,
  metadataJson: string | null,
) {
  const metadata = metadataJson ? JSON.parse(metadataJson) : {};

  if (purpose === "wallet_deposit") {
    await creditWallet({ userId, amount, type: "DEPOSIT", description: "M-Pesa wallet deposit" });
    emitToast(userId, {
      type: "success",
      title: "Deposit confirmed!",
      message: `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })} added to your wallet.`,
      linkUrl: "/dashboard/wallet",
      linkLabel: "View wallet →",
      duration: 10000,
    });
    return;
  }

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
    const { challengerSquadUrl, hostId, whatsappNumber } = metadata as {
      challengerSquadUrl: string;
      hostId: string;
      whatsappNumber?: string;
    };
    const result = await prisma.challenge.updateMany({
      where: { id: entityId, status: "OPEN" },
      data: { challengerId: userId, challengerSquadUrl, status: "ACTIVE", matchedAt: new Date() },
    });
    if (result.count === 0) return;
    if (whatsappNumber) {
      await prisma.user.update({ where: { id: userId }, data: { whatsappNumber } });
    }
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
    emitChallengeUpdate(userId, hostId ?? null, entityId);
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
    await prisma.shopOrder.update({ where: { id: entityId }, data: { status: "PAID" } });
    return;
  }

  if (purpose === "rank_push") {
    await prisma.rankPushOrder.update({ where: { id: entityId }, data: { status: "IN_PROGRESS" } });
    const order = await prisma.rankPushOrder.findUnique({
      where: { id: entityId },
      select: { providerId: true, clientId: true },
    });
    if (order) {
      await createNotification(order.providerId, "RANK_PUSH_ORDER", {
        title: "New rank push order!",
        body: "A client has paid for your rank pushing service.",
        linkUrl: `/dashboard/rank-push`,
      });
      emitToast(order.providerId, {
        type: "success",
        title: "New order received!",
        message: "A client paid for your rank push service.",
        linkUrl: `/dashboard/rank-push`,
        linkLabel: "View order →",
        duration: 10000,
      });
    }
    return;
  }
}
