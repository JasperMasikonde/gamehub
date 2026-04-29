import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate, emitWalletUpdate } from "@/lib/socket-server";
import { creditWallet } from "@/lib/wallet";

const schema = z.object({
  reason: z.string().min(10).max(1000),
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
      challenger: { select: { id: true, username: true, displayName: true } },
    },
  });

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.status !== "ACTIVE") {
    return NextResponse.json({ error: "Only ACTIVE challenges can be unmatched" }, { status: 400 });
  }
  if (!challenge.challengerId || !challenge.challenger) {
    return NextResponse.json({ error: "No challenger to unmatch" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { reason } = parsed.data;
  const challengerId = challenge.challengerId;
  const wager = Number(challenge.wagerAmount);

  // Refund challenger's wager
  const tx = await creditWallet({
    userId: challengerId,
    amount: wager,
    type: "ADMIN_ADJUSTMENT",
    description: `Wager refund: unmatched from challenge #${id.slice(-8)} by admin`,
    challengeId: id,
  });

  // Reset challenge back to OPEN, clearing all challenger-related fields
  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      status: "OPEN",
      challengerId: null,
      challengerSquadUrl: null,
      challengerResult: null,
      hostResult: null,
      matchedAt: null,
      proposedMatchTime: null,
      proposedByHost: null,
      scheduledAt: null,
      resultDeadlineAt: null,
      adminNote: reason,
    },
  });

  await prisma.adminAction.create({
    data: {
      adminId: adminUser.id,
      action: "CHALLENGE_UNMATCHED",
      note: reason,
      metadata: { challengeId: id, challengerId },
    },
  });

  // Notify challenger
  await createNotification(challengerId, "CHALLENGE_CANCELLED", {
    title: "You were unmatched from a challenge",
    body: `Your wager of KES ${wager.toLocaleString("en-KE", { minimumFractionDigits: 2 })} has been refunded to your wallet. Reason: ${reason}`,
    linkUrl: `/dashboard/wallet`,
  });

  // Notify host
  await createNotification(challenge.hostId, "CHALLENGE_ACCEPTED", {
    title: "Your opponent was removed",
    body: `An admin unmatched your challenger. Your challenge is now open for others to join.`,
    linkUrl: `/challenges/${id}`,
  });

  // Real-time updates
  emitWalletUpdate(challengerId, Number(tx.balanceAfter));
  emitToast(challengerId, {
    type: "warning",
    title: "You were unmatched",
    message: `Your wager of KES ${wager.toLocaleString("en-KE", { minimumFractionDigits: 2 })} has been refunded. Reason: ${reason}`,
    linkUrl: "/dashboard/wallet",
    linkLabel: "View wallet →",
    duration: 0,
  });
  emitToast(challenge.hostId, {
    type: "info",
    title: "Opponent removed",
    message: "An admin unmatched your challenger. Your challenge is open again.",
    linkUrl: `/challenges/${id}`,
    linkLabel: "View challenge →",
    duration: 10000,
  });
  emitChallengeUpdate(challenge.hostId, challengerId, id);

  return NextResponse.json({ challenge: updated });
}
