import { TransactionStatus, type Transaction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitToAdmins, emitTransactionUpdate } from "@/lib/socket-server";
import {
  sendEscrowFundedEmail,
  sendCredentialsDeliveredEmail,
  sendTransactionCompletedEmail,
  sendDisputeRaisedEmail,
  sendRefundEmail,
} from "@/lib/email";

// Valid state transitions for the escrow state machine
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING_PAYMENT: [TransactionStatus.IN_ESCROW, TransactionStatus.CANCELLED],
  IN_ESCROW: [TransactionStatus.DELIVERED, TransactionStatus.CANCELLED],
  DELIVERED: [TransactionStatus.COMPLETED, TransactionStatus.DISPUTED],
  COMPLETED: [],
  DISPUTED: [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED],
  REFUNDED: [],
  CANCELLED: [],
};

export function canTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionTransaction(
  transactionId: string,
  newStatus: TransactionStatus,
  actorId: string,
  note?: string
): Promise<Transaction> {
  const tx = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
  });

  if (!canTransition(tx.status, newStatus)) {
    throw new Error(
      `Invalid transition: ${tx.status} → ${newStatus}`
    );
  }

  const now = new Date();
  const siteConfig = await prisma.siteConfig.findUnique({
    where: { id: "singleton" },
  });
  const buyerWindowDays = siteConfig?.buyerWindowDays ?? 3;
  const sellerWindowDays = siteConfig?.sellerWindowDays ?? 2;

  const updates: Partial<Transaction> = { status: newStatus };

  if (newStatus === TransactionStatus.IN_ESCROW) {
    updates.paymentConfirmedAt = now;
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + sellerWindowDays);
    updates.deliveryDeadline = deadline;
  }

  if (newStatus === TransactionStatus.DELIVERED) {
    updates.deliveredAt = now;
    updates.credentialsDelivered = true;
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + buyerWindowDays);
    updates.confirmationDeadline = deadline;
  }

  if (newStatus === TransactionStatus.COMPLETED) {
    updates.completedAt = now;
  }

  if (newStatus === TransactionStatus.REFUNDED) {
    updates.refundedAt = now;
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: updates as Parameters<typeof prisma.transaction.update>[0]["data"],
  });

  // Fire notifications
  await notifyOnTransition(updated, newStatus, actorId);

  // Real-time update for both parties
  emitTransactionUpdate(updated.buyerId, updated.sellerId, updated.id);

  return updated;
}

async function notifyOnTransition(
  tx: Transaction,
  newStatus: TransactionStatus,
  _actorId: string
) {
  const escrowLink = `/dashboard/escrow/${tx.id}`;

  // Fetch user emails + listing title for transactional emails
  const [buyer, seller, listing] = await Promise.all([
    prisma.user.findUnique({ where: { id: tx.buyerId }, select: { email: true, displayName: true, username: true } }),
    prisma.user.findUnique({ where: { id: tx.sellerId }, select: { email: true, displayName: true, username: true } }),
    prisma.listing.findUnique({ where: { id: tx.listingId }, select: { title: true } }),
  ]);
  const listingTitle = listing?.title ?? "eFootball Account";

  switch (newStatus) {
    case TransactionStatus.IN_ESCROW:
      await createNotification(tx.sellerId, "ESCROW_FUNDED", {
        title: "Payment received — deliver the account",
        body: "A buyer has paid. Please deliver the account credentials.",
        linkUrl: escrowLink,
      });
      emitToast(tx.sellerId, {
        type: "success",
        title: "Payment received!",
        message: "A buyer has paid. Go deliver the account credentials.",
        linkUrl: escrowLink,
        linkLabel: "View escrow",
        duration: 8000,
      });
      if (seller && tx.deliveryDeadline) {
        sendEscrowFundedEmail({
          toEmail: seller.email,
          toName: seller.displayName ?? seller.username,
          transactionId: tx.id,
          listingTitle,
          deliveryDeadline: tx.deliveryDeadline,
        }).catch(() => null);
      }
      break;

    case TransactionStatus.DELIVERED:
      await createNotification(tx.buyerId, "CREDENTIALS_DELIVERED", {
        title: "Account credentials delivered",
        body: "The seller has delivered the account. Please confirm receipt.",
        linkUrl: escrowLink,
      });
      emitToast(tx.buyerId, {
        type: "info",
        title: "Account delivered!",
        message: "The seller has sent the credentials. Please confirm receipt within 3 days.",
        linkUrl: escrowLink,
        linkLabel: "Confirm now",
        duration: 10000,
      });
      if (buyer && tx.confirmationDeadline) {
        sendCredentialsDeliveredEmail({
          toEmail: buyer.email,
          toName: buyer.displayName ?? buyer.username,
          transactionId: tx.id,
          listingTitle,
          confirmationDeadline: tx.confirmationDeadline,
        }).catch(() => null);
      }
      break;

    case TransactionStatus.COMPLETED:
      await createNotification(tx.sellerId, "ESCROW_RELEASED", {
        title: "Funds released!",
        body: "The transaction is complete and funds have been released.",
        linkUrl: escrowLink,
      });
      emitToast(tx.sellerId, {
        type: "success",
        title: "Funds released! 🎉",
        message: "The transaction is complete. Funds have been released to you.",
        linkUrl: escrowLink,
        linkLabel: "View transaction",
        duration: 8000,
      });
      if (seller) {
        sendTransactionCompletedEmail({
          toEmail: seller.email,
          toName: seller.displayName ?? seller.username,
          transactionId: tx.id,
          listingTitle,
        }).catch(() => null);
      }
      break;

    case TransactionStatus.DISPUTED: {
      // Notify seller
      await createNotification(tx.sellerId, "DISPUTE_RAISED", {
        title: "Dispute raised",
        body: "The buyer has raised a dispute. An admin will review.",
        linkUrl: escrowLink,
      });
      emitToast(tx.sellerId, {
        type: "warning",
        title: "Dispute raised",
        message: "The buyer has opened a dispute. An admin will review the case.",
        linkUrl: escrowLink,
        linkLabel: "View dispute",
        duration: 10000,
      });

      // Notify all admins in DB + real-time toast
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      await Promise.all(
        admins.map((a) =>
          createNotification(a.id, "DISPUTE_RAISED", {
            title: "New dispute raised",
            body: `A buyer has raised a dispute on transaction ${tx.id.slice(-8)}. Review required.`,
            linkUrl: `/admin/disputes`,
          })
        )
      );
      emitToAdmins({
        type: "warning",
        title: "New dispute raised",
        message: `A buyer opened a dispute on transaction #${tx.id.slice(-8)}`,
        linkUrl: "/admin/disputes",
        linkLabel: "Review →",
        duration: 0,
      });
      if (seller) {
        sendDisputeRaisedEmail({
          toEmail: seller.email,
          toName: seller.displayName ?? seller.username,
          transactionId: tx.id,
          listingTitle,
        }).catch(() => null);
      }
      break;
    }

    case TransactionStatus.REFUNDED:
      await createNotification(tx.buyerId, "ESCROW_REFUNDED", {
        title: "Refund processed",
        body: "The dispute was resolved in your favor. Your funds will be returned.",
        linkUrl: escrowLink,
      });
      emitToast(tx.buyerId, {
        type: "info",
        title: "Refund approved",
        message: "The dispute was resolved in your favor. Your funds are being returned.",
        linkUrl: escrowLink,
        linkLabel: "View transaction",
        duration: 8000,
      });
      if (buyer) {
        sendRefundEmail({
          toEmail: buyer.email,
          toName: buyer.displayName ?? buyer.username,
          transactionId: tx.id,
          listingTitle,
        }).catch(() => null);
      }
      break;
  }
}

export function calculateFees(
  price: number,
  feeRate: number
): { platformFee: number; sellerReceives: number } {
  const platformFee = Math.round(price * feeRate * 100) / 100;
  const sellerReceives = Math.round((price - platformFee) * 100) / 100;
  return { platformFee, sellerReceives };
}
