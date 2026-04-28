import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { debitWallet, creditWallet } from "@/lib/wallet";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate } from "@/lib/socket-server";

const schema = z.object({
  /** "host" → pay host wager (PENDING_HOST_PAYMENT → OPEN)
   *  "challenger" → pay challenger wager (OPEN → ACTIVE)   */
  role: z.enum(["host", "challenger"]),
  challengerSquadUrl: z.string().optional(), // required when role=challenger
  whatsappNumber: z.string().max(20).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { role, challengerSquadUrl, whatsappNumber } = parsed.data;
  const userId = session.user.id;

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role === "host") {
    if (challenge.hostId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (challenge.status !== "PENDING_HOST_PAYMENT")
      return NextResponse.json({ error: "Challenge is not awaiting host payment" }, { status: 400 });

    try {
      await debitWallet({
        userId,
        amount: Number(challenge.wagerAmount),
        type: "CHALLENGE_WAGER",
        description: `Host wager for challenge #${id.slice(-8)} (KES ${Number(challenge.wagerAmount).toFixed(2)})`,
        challengeId: id,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      const status = msg === "Insufficient wallet balance" ? 400 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: { status: "OPEN" },
    });

    emitChallengeUpdate(userId, null, id);
    return NextResponse.json({ challenge: updated });
  }

  // role === "challenger"
  if (challenge.hostId === userId)
    return NextResponse.json({ error: "You cannot accept your own challenge" }, { status: 400 });
  if (challenge.status !== "OPEN")
    return NextResponse.json({ error: "Challenge is no longer open" }, { status: 409 });
  if (!challengerSquadUrl)
    return NextResponse.json({ error: "Squad screenshot is required" }, { status: 400 });

  const wagerNum = Number(challenge.wagerAmount);

  try {
    await debitWallet({
      userId,
      amount: wagerNum,
      type: "CHALLENGE_WAGER",
      description: `Challenger wager for challenge #${id.slice(-8)} (KES ${wagerNum.toFixed(2)})`,
      challengeId: id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment failed";
    const status = msg === "Insufficient wallet balance" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  // Race-safe update — only proceed if still OPEN
  const result = await prisma.challenge.updateMany({
    where: { id, status: "OPEN" },
    data: { challengerId: userId, challengerSquadUrl, status: "ACTIVE", matchedAt: new Date() },
  });

  if (result.count === 0) {
    // Refund immediately — challenge was taken by someone else
    await creditWallet({
      userId,
      amount: wagerNum,
      type: "ADMIN_ADJUSTMENT",
      description: `Refund: challenge #${id.slice(-8)} already taken`,
      challengeId: id,
    });
    return NextResponse.json({ error: "Challenge already accepted by another player" }, { status: 409 });
  }

  const updated = await prisma.challenge.findUnique({ where: { id } });

  if (whatsappNumber) {
    await prisma.user.update({ where: { id: userId }, data: { whatsappNumber } });
  }

  // Notify host
  await createNotification(challenge.hostId, "CHALLENGE_ACCEPTED", {
    title: "Challenge accepted!",
    body: `${session.user.username} accepted your match challenge. Head to the challenge room.`,
    linkUrl: `/challenges/${id}`,
  });
  emitToast(challenge.hostId, {
    type: "success",
    title: "Challenge accepted!",
    message: `${session.user.username} paid the wager and is ready to play.`,
    linkUrl: `/challenges/${id}`,
    linkLabel: "Go to challenge →",
    duration: 10000,
  });
  emitChallengeUpdate(challenge.hostId, userId, id);

  return NextResponse.json({ challenge: updated });
}
