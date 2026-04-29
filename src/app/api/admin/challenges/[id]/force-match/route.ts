import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate, emitWalletUpdate } from "@/lib/socket-server";
import { debitWallet } from "@/lib/wallet";
import { getWalletBalance } from "@/lib/wallet";

// GET /api/admin/challenges/[id]/force-match?q=term
// Returns users (with wallet balance) eligible to be matched into this challenge
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    select: { hostId: true, wagerAmount: true, status: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: challenge.hostId },
      status: "ACTIVE",
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      wallet: { select: { balance: true } },
    },
  });

  const wager = Number(challenge.wagerAmount);
  const results = users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    balance: Number(u.wallet?.balance ?? 0),
    canAfford: Number(u.wallet?.balance ?? 0) >= wager,
  }));

  return NextResponse.json({ users: results, wager });
}

const matchSchema = z.object({
  userId: z.string().min(1),
});

// POST /api/admin/challenges/[id]/force-match
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let adminUser: { id: string; username: string };
  try { adminUser = await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { host: { select: { id: true, username: true, displayName: true } } },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.status !== "OPEN") {
    return NextResponse.json({ error: "Challenge must be OPEN to force-match" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { userId } = parsed.data;

  if (userId === challenge.hostId) {
    return NextResponse.json({ error: "Cannot match the host against themselves" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "User not found or inactive" }, { status: 400 });
  }

  const wager = Number(challenge.wagerAmount);
  const balance = await getWalletBalance(userId);
  if (balance < wager) {
    return NextResponse.json(
      { error: `Insufficient balance. User has KES ${balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })} but wager is KES ${wager.toLocaleString("en-KE", { minimumFractionDigits: 2 })}` },
      { status: 400 }
    );
  }

  // Debit challenger's wallet
  const tx = await debitWallet({
    userId,
    amount: wager,
    type: "CHALLENGE_WAGER",
    description: `Challenge wager #${id.slice(-8)} (admin-matched)`,
    challengeId: id,
  });

  // Match the challenger
  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      challengerId: userId,
      status: "ACTIVE",
      matchedAt: new Date(),
    },
  });

  // Log admin action
  await prisma.adminAction.create({
    data: {
      adminId: adminUser.id,
      action: "CHALLENGE_FORCE_MATCHED",
      note: `Force-matched ${user.username} as challenger`,
      metadata: { challengeId: id, challengerId: userId },
    },
  });

  // Notify challenger
  await createNotification(userId, "CHALLENGE_ACCEPTED", {
    title: "You've been matched into a challenge!",
    body: `An admin matched you into a challenge. KES ${wager.toLocaleString("en-KE", { minimumFractionDigits: 2 })} has been debited from your wallet.`,
    linkUrl: `/challenges/${id}`,
  });

  // Notify host
  await createNotification(challenge.hostId, "CHALLENGE_ACCEPTED", {
    title: "Challenge accepted!",
    body: "An admin matched an opponent into your challenge. Head to the challenge room.",
    linkUrl: `/challenges/${id}`,
  });

  // Real-time updates
  const newBalance = Number(tx.balanceAfter);
  emitWalletUpdate(userId, newBalance);
  emitToast(userId, {
    type: "info",
    title: "Matched into a challenge!",
    message: `An admin matched you as a challenger. KES ${wager.toLocaleString("en-KE", { minimumFractionDigits: 2 })} debited from your wallet.`,
    linkUrl: `/challenges/${id}`,
    linkLabel: "Go to challenge →",
    duration: 0,
  });
  emitToast(challenge.hostId, {
    type: "success",
    title: "Opponent matched!",
    message: "An admin matched an opponent into your challenge.",
    linkUrl: `/challenges/${id}`,
    linkLabel: "Go to challenge →",
    duration: 10000,
  });
  emitChallengeUpdate(challenge.hostId, userId, id);

  return NextResponse.json({ challenge: updated });
}
