import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate } from "@/lib/socket-server";
import { creditWallet } from "@/lib/wallet";
import { sendAdminNotification } from "@/lib/email";

const schema = z.object({
  winnerId: z.string().min(1),
  adminNote: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await resolveSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.status !== "DISPUTED") {
    return NextResponse.json({ error: "Challenge is not disputed" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { winnerId, adminNote } = parsed.data;

  // Validate winnerId is one of the parties
  if (winnerId !== challenge.hostId && winnerId !== challenge.challengerId) {
    return NextResponse.json({ error: "Winner must be host or challenger" }, { status: 400 });
  }

  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      status: "COMPLETED",
      winnerId,
      completedAt: new Date(),
      adminNote: adminNote ?? null,
    },
  });

  const loserId = winnerId === challenge.hostId ? challenge.challengerId! : challenge.hostId;
  const pool = Number(challenge.wagerAmount) * 2;
  const platFee = challenge.platformFee != null ? Number(challenge.platformFee) : 0;
  const txFee = challenge.transactionFee != null ? Number(challenge.transactionFee) : 0;
  const totalFee = platFee + txFee;
  const payout = pool - totalFee;
  const prize = payout.toFixed(2);

  // Credit winner's wallet
  await creditWallet({
    userId: winnerId,
    amount: payout,
    type: "CHALLENGE_WIN",
    description: `Challenge dispute resolved — win payout (KES ${pool.toFixed(2)} pool − KES ${totalFee.toFixed(2)} fees)`,
    challengeId: id,
  });

  await Promise.all([
    createNotification(winnerId, "CHALLENGE_WON", {
      title: "Challenge dispute resolved — You won! 🏆",
      body: `An admin reviewed the conflicting results and awarded you the win. Prize: KES ${prize}`,
      linkUrl: `/challenges/${id}`,
    }),
    createNotification(loserId, "CHALLENGE_LOST", {
      title: "Challenge dispute resolved",
      body: `An admin reviewed the conflicting results and awarded the win to your opponent.`,
      linkUrl: `/challenges/${id}`,
    }),
  ]);

  emitToast(winnerId, {
    type: "success",
    title: "Dispute resolved — You won! 🏆",
    message: "Admin reviewed and awarded you the win.",
    linkUrl: `/challenges/${id}`,
    linkLabel: "View challenge →",
    duration: 0,
  });
  emitToast(loserId, {
    type: "info",
    title: "Dispute resolved",
    message: "Admin reviewed and awarded the win to your opponent.",
    linkUrl: `/challenges/${id}`,
    linkLabel: "View challenge →",
    duration: 10000,
  });
  emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

  return NextResponse.json({ challenge: updated });
}
