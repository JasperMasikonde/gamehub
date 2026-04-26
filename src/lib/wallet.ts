import { prisma } from "@/lib/prisma";
import type { WalletTxType } from "@prisma/client";

/** Ensure the user has a wallet row, then return it. */
async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  });
}

/**
 * Credit a user's wallet inside a Prisma transaction.
 * Returns the new WalletTransaction record.
 */
export async function creditWallet({
  userId,
  amount,
  type,
  description,
  challengeId,
  payoutId,
}: {
  userId: string;
  amount: number | string;
  type: WalletTxType;
  description: string;
  challengeId?: string;
  payoutId?: string;
}) {
  const amt = Number(amount);

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: { balance: { increment: amt } },
      create: { userId, balance: amt },
    });

    return tx.walletTransaction.create({
      data: {
        userId,
        type,
        amount: amt,
        balanceAfter: wallet.balance,
        description,
        challengeId,
        payoutId,
      },
    });
  });
}

/**
 * Debit a user's wallet inside a Prisma transaction.
 * Throws "Insufficient wallet balance" if the balance would go negative.
 */
export async function debitWallet({
  userId,
  amount,
  type,
  description,
  challengeId,
  payoutId,
}: {
  userId: string;
  amount: number | string;
  type: WalletTxType;
  description: string;
  challengeId?: string;
  payoutId?: string;
}) {
  const amt = Number(amount);

  return prisma.$transaction(async (tx) => {
    // Ensure wallet row exists
    await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });

    // Atomic check-and-decrement: only succeeds if balance >= amt
    const result = await tx.wallet.updateMany({
      where: { userId, balance: { gte: amt } },
      data: { balance: { decrement: amt } },
    });

    if (result.count === 0) {
      throw new Error("Insufficient wallet balance");
    }

    const wallet = await tx.wallet.findUnique({ where: { userId } });

    return tx.walletTransaction.create({
      data: {
        userId,
        type,
        amount: amt,
        balanceAfter: wallet!.balance,
        description,
        challengeId,
        payoutId,
      },
    });
  });
}

/** Return the user's current wallet balance (0 if no wallet yet). */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet ? Number(wallet.balance) : 0;
}
