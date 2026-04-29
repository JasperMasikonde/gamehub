/**
 * Central payment fulfillment module.
 *
 * claimAndFulfill() is the single entry point for all three payment
 * completion paths: STK-push callback, paybill push notification, and
 * client-side status polling.
 *
 * Guarantees:
 *  1. Exactly-once execution — uses an atomic conditional UPDATE
 *     (WHERE status NOT IN terminal) so concurrent callers can race
 *     without double-fulfilling.
 *  2. wallet_deposit is claimed AND credited in one DB transaction,
 *     so a crash between the two is impossible.
 *  3. Lost-race challengers (challenge already taken) are auto-refunded.
 */

import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { createNotification } from "@/lib/notifications";
import {
  emitToast,
  emitChallengeUpdate,
  emitTournamentUpdate,
  emitWalletUpdate,
} from "@/lib/socket-server";
import { creditWallet } from "@/lib/wallet";

type FulfillablePayment = {
  id: string;
  userId: string;
  amount: { toString(): string } | number | string;
  purpose: string;
  entityId: string;
  metadata: string | null;
};

/**
 * Atomically marks the payment COMPLETED and runs the purpose-specific
 * business action. Returns false if another process already claimed it
 * (caller should skip all further work).
 */
export async function claimAndFulfill(payment: FulfillablePayment): Promise<boolean> {
  const { id, userId, purpose, entityId, metadata: metadataJson } = payment;
  const amount = Number(payment.amount.toString());

  // ── wallet_deposit: claim + credit in ONE transaction ─────────────────────
  // This is the only purpose where money flows directly into a wallet on
  // confirmation, so the status flip and the wallet credit must be atomic.
  if (purpose === "wallet_deposit") {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.payment.updateMany({
        where: { id, status: { notIn: ["COMPLETED", "FAILED"] } },
        data: { status: "COMPLETED" },
      });
      if (claim.count === 0) return null; // already claimed

      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount },
      });
      await tx.walletTransaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          amount,
          balanceAfter: wallet.balance,
          description: "M-Pesa wallet deposit",
        },
      });
      return Number(wallet.balance);
    });

    if (result === null) return false;

    emitWalletUpdate(userId, result);
    emitToast(userId, {
      type: "success",
      title: "Deposit confirmed!",
      message: `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })} added to your wallet.`,
      linkUrl: "/dashboard/wallet",
      linkLabel: "View wallet →",
      duration: 10000,
    });
    return true;
  }

  // ── All other purposes: atomic claim, then business action ────────────────
  const claim = await prisma.payment.updateMany({
    where: { id, status: { notIn: ["COMPLETED", "FAILED"] } },
    data: { status: "COMPLETED" },
  });
  if (claim.count === 0) return false;

  const metadata = metadataJson
    ? (JSON.parse(metadataJson) as Record<string, unknown>)
    : {};

  try {
    await fulfillPurpose(purpose, entityId, userId, amount, metadata);
  } catch (err) {
    console.error(`[claimAndFulfill] fulfillPurpose(${purpose}) error:`, err);
  }

  return true;
}

async function fulfillPurpose(
  purpose: string,
  entityId: string,
  userId: string,
  amount: number,
  metadata: Record<string, unknown>
) {
  // ── escrow ────────────────────────────────────────────────────────────────
  if (purpose === "escrow") {
    await transitionTransaction(entityId, "IN_ESCROW", userId);
    return;
  }

  // ── challenge_host ────────────────────────────────────────────────────────
  if (purpose === "challenge_host") {
    await prisma.challenge.update({
      where: { id: entityId },
      data: { status: "OPEN" },
    });
    emitChallengeUpdate(userId, null, entityId);
    return;
  }

  // ── challenge (challenger joins) ──────────────────────────────────────────
  if (purpose === "challenge") {
    const { challengerSquadUrl, hostId, whatsappNumber } = metadata as {
      challengerSquadUrl: string;
      hostId: string;
      whatsappNumber?: string;
    };

    // updateMany WHERE status = OPEN is the idempotency guard:
    // if two challengers race, only one wins the slot.
    const result = await prisma.challenge.updateMany({
      where: { id: entityId, status: "OPEN" },
      data: {
        challengerId: userId,
        challengerSquadUrl,
        status: "ACTIVE",
        matchedAt: new Date(),
      },
    });

    // Lost the race — challenge already taken. Refund immediately.
    if (result.count === 0) {
      const walletTx = await creditWallet({
        userId,
        amount,
        type: "ADMIN_ADJUSTMENT",
        description: `Auto-refund: challenge #${entityId.slice(-8)} was already matched`,
      });
      emitWalletUpdate(userId, Number(walletTx.balanceAfter));
      emitToast(userId, {
        type: "info",
        title: "Challenge already taken",
        message:
          "Another player accepted this challenge at the same time. Your wager has been refunded to your wallet.",
        linkUrl: "/dashboard/wallet",
        linkLabel: "View wallet →",
        duration: 0,
      });
      return;
    }

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

  // ── tournament ────────────────────────────────────────────────────────────
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

  // ── shop ──────────────────────────────────────────────────────────────────
  if (purpose === "shop") {
    await prisma.shopOrder.update({ where: { id: entityId }, data: { status: "PAID" } });
    return;
  }

  // ── rank_push ─────────────────────────────────────────────────────────────
  if (purpose === "rank_push") {
    await prisma.rankPushOrder.update({
      where: { id: entityId },
      data: { status: "IN_PROGRESS" },
    });
    const order = await prisma.rankPushOrder.findUnique({
      where: { id: entityId },
      select: { providerId: true },
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
