import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { querySTKPush } from "@/lib/ncba";
import { transitionTransaction } from "@/lib/escrow";
import { emitToast, emitChallengeUpdate, emitTournamentUpdate, emitWalletUpdate } from "@/lib/socket-server";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return cached terminal state immediately
  if (payment.status === "COMPLETED") return NextResponse.json({ status: "COMPLETED" });
  if (payment.status === "FAILED") {
    return NextResponse.json({ status: "FAILED", reason: payment.failureReason });
  }

  if (!payment.ncbaTransactionId) {
    return NextResponse.json({ status: "PENDING" });
  }

  // Query NCBA
  let queryResult;
  try {
    queryResult = await querySTKPush(payment.ncbaTransactionId);
  } catch (err) {
    console.error("[payments/status] NCBA query error:", err);
    return NextResponse.json({ status: "PENDING" });
  }

  // NCBA query response: { status: "SUCCESS" | "FAILED", description: string }
  // NOTE: Do NOT treat FAILED as a definitive decline — NCBA's query returns
  // FAILED for Fuliza (overdraft) payments even when money is successfully
  // debited, because it only tracks direct M-Pesa balance.
  // Only mark COMPLETED from the query; rely on the push notification callback
  // for confirmed failures.
  if (queryResult.status === "SUCCESS") {
    await prisma.payment.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    try {
      await fulfillPayment(payment.purpose, payment.entityId, session.user.id, Number(payment.amount), payment.metadata ?? null);
    } catch (err) {
      console.error("[payments/status] fulfillPayment error:", err);
    }

    return NextResponse.json({ status: "COMPLETED" });
  }

  // FAILED from query or unknown — keep as PENDING and let the push
  // notification callback confirm the real outcome
  await prisma.payment.update({ where: { id }, data: { status: "PROCESSING" } });
  return NextResponse.json({ status: "PENDING" });
}

async function fulfillPayment(
  purpose: string,
  entityId: string,
  userId: string,
  amount: number,
  metadataJson: string | null
) {
  const metadata = metadataJson ? JSON.parse(metadataJson) : {};

  if (purpose === "wallet_deposit") {
    const { creditWallet } = await import("@/lib/wallet");
    const tx = await creditWallet({ userId, amount, type: "DEPOSIT", description: "M-Pesa wallet deposit" });
    emitWalletUpdate(userId, Number(tx.balanceAfter));
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
    const { challengerSquadUrl, hostId } = metadata as { challengerSquadUrl: string; hostId: string };
    const result = await prisma.challenge.updateMany({
      where: { id: entityId, status: "OPEN" },
      data: { challengerId: userId, challengerSquadUrl, status: "ACTIVE" },
    });
    if (result.count === 0) return;
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
    await prisma.shopOrder.update({
      where: { id: entityId },
      data: { status: "PAID" },
    });
    return;
  }

  if (purpose === "rank_push") {
    await prisma.rankPushOrder.update({
      where: { id: entityId },
      data: { status: "IN_PROGRESS" },
    });
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
