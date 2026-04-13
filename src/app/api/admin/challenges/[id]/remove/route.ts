import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate } from "@/lib/socket-server";
import { sendChallengeRemovedEmail } from "@/lib/email";
import { creditWallet } from "@/lib/wallet";

const schema = z.object({
  reason: z.string().min(10, "Please provide a reason (at least 10 characters)").max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let adminUser: { id: string; username: string };
  try {
    adminUser = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, username: true, displayName: true, email: true } },
      challenger: { select: { id: true, username: true, displayName: true, email: true } },
    },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const terminalStatuses = ["COMPLETED", "CANCELLED"];
  if (terminalStatuses.includes(challenge.status)) {
    return NextResponse.json(
      { error: "Cannot remove a challenge that is already completed or cancelled" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { reason } = parsed.data;

  // Refund wagers that have already been paid
  const refunds: Promise<unknown>[] = [];
  const wager = Number(challenge.wagerAmount);

  // Host paid if status is beyond PENDING_HOST_PAYMENT
  const hostPaid = challenge.status !== "PENDING_HOST_PAYMENT";
  if (hostPaid) {
    refunds.push(
      creditWallet({
        userId: challenge.hostId,
        amount: wager,
        type: "ADMIN_ADJUSTMENT",
        description: `Wager refund: challenge #${id.slice(-8)} removed by admin`,
        challengeId: id,
      })
    );
  }

  // Challenger paid if status is ACTIVE, SUBMITTED, or DISPUTED
  const challengerPaidStatuses = ["ACTIVE", "SUBMITTED", "DISPUTED"];
  if (challenge.challengerId && challengerPaidStatuses.includes(challenge.status)) {
    refunds.push(
      creditWallet({
        userId: challenge.challengerId,
        amount: wager,
        type: "ADMIN_ADJUSTMENT",
        description: `Wager refund: challenge #${id.slice(-8)} removed by admin`,
        challengeId: id,
      })
    );
  }

  await Promise.all(refunds);

  const updated = await prisma.challenge.update({
    where: { id },
    data: { status: "CANCELLED", adminNote: reason },
  });

  // Log admin action
  await prisma.adminAction.create({
    data: {
      adminId: adminUser.id,
      action: "CHALLENGE_REMOVED",
      note: reason,
      metadata: { challengeId: id },
    },
  });

  // Notify and email both parties
  const notifyParties: Promise<unknown>[] = [
    createNotification(challenge.hostId, "CHALLENGE_CANCELLED", {
      title: "Your challenge was removed by an admin",
      body: `Reason: ${reason}`,
      linkUrl: `/challenges/${id}`,
    }),
  ];

  if (challenge.challengerId) {
    notifyParties.push(
      createNotification(challenge.challengerId, "CHALLENGE_CANCELLED", {
        title: "A challenge you joined was removed by an admin",
        body: `Reason: ${reason}`,
        linkUrl: `/challenges/${id}`,
      })
    );
  }

  await Promise.all(notifyParties);

  // Send emails (fire-and-forget)
  const emailJobs: Promise<unknown>[] = [
    sendChallengeRemovedEmail({
      toEmail: challenge.host.email,
      toName: challenge.host.displayName ?? challenge.host.username,
      challengeId: id,
      reason,
    }).catch(console.error),
  ];

  if (challenge.challenger) {
    emailJobs.push(
      sendChallengeRemovedEmail({
        toEmail: challenge.challenger.email,
        toName: challenge.challenger.displayName ?? challenge.challenger.username,
        challengeId: id,
        reason,
      }).catch(console.error)
    );
  }

  Promise.all(emailJobs);

  // Emit real-time updates
  emitToast(challenge.hostId, {
    type: "warning",
    title: "Challenge removed",
    message: `An admin removed your challenge. Reason: ${reason}`,
    linkUrl: `/challenges/${id}`,
    linkLabel: "View details →",
    duration: 0,
  });
  if (challenge.challengerId) {
    emitToast(challenge.challengerId, {
      type: "warning",
      title: "Challenge removed",
      message: `An admin removed a challenge you joined. Reason: ${reason}`,
      linkUrl: `/challenges/${id}`,
      linkLabel: "View details →",
      duration: 0,
    });
  }
  emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

  return NextResponse.json({ challenge: updated });
}
