import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { debitWallet, creditWallet, getWalletBalance } from "@/lib/wallet";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate, emitWalletUpdate } from "@/lib/socket-server";

// GET /api/admin/challenges/create?q=term&wager=amount
// Search users with wallet balance for host/challenger selection
export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const wager = parseFloat(req.nextUrl.searchParams.get("wager") ?? "0");
  const excludeId = req.nextUrl.searchParams.get("exclude") ?? "";

  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      ...(excludeId ? { id: { not: excludeId } } : {}),
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

  const results = users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    balance: Number(u.wallet?.balance ?? 0),
    canAfford: wager > 0 ? Number(u.wallet?.balance ?? 0) >= wager : true,
  }));

  return NextResponse.json({ users: results });
}

const createSchema = z.object({
  hostId: z.string().min(1),
  challengerId: z.string().min(1),
  format: z.enum(["BEST_OF_1", "BEST_OF_3", "BEST_OF_5"]),
  wagerAmount: z.coerce.number().positive(),
  description: z.string().max(500).optional(),
});

// POST /api/admin/challenges/create
export async function POST(req: NextRequest) {
  let adminUser: { id: string; username: string };
  try { adminUser = await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { hostId, challengerId, format, wagerAmount, description } = parsed.data;

  if (hostId === challengerId) {
    return NextResponse.json({ error: "Host and challenger must be different users" }, { status: 400 });
  }

  const [host, challenger] = await Promise.all([
    prisma.user.findUnique({ where: { id: hostId }, select: { id: true, username: true, displayName: true, status: true } }),
    prisma.user.findUnique({ where: { id: challengerId }, select: { id: true, username: true, displayName: true, status: true } }),
  ]);

  if (!host || host.status !== "ACTIVE")
    return NextResponse.json({ error: "Host user not found or inactive" }, { status: 400 });
  if (!challenger || challenger.status !== "ACTIVE")
    return NextResponse.json({ error: "Challenger user not found or inactive" }, { status: 400 });

  // Check wallet balances
  const [hostBalance, challengerBalance] = await Promise.all([
    getWalletBalance(hostId),
    getWalletBalance(challengerId),
  ]);

  if (hostBalance < wagerAmount)
    return NextResponse.json({ error: `${host.displayName ?? host.username} has insufficient balance (KES ${hostBalance.toFixed(2)})` }, { status: 400 });
  if (challengerBalance < wagerAmount)
    return NextResponse.json({ error: `${challenger.displayName ?? challenger.username} has insufficient balance (KES ${challengerBalance.toFixed(2)})` }, { status: 400 });

  // Look up applicable fee rule
  const feeRule = await prisma.platformFeeRule.findFirst({
    where: { isActive: true, minWager: { lte: wagerAmount }, maxWager: { gte: wagerAmount } },
    orderBy: { minWager: "asc" },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create the challenge first so we have the ID for wallet transactions
  const challenge = await prisma.challenge.create({
    data: {
      hostId,
      challengerId,
      format,
      wagerAmount,
      currency: "KES",
      description,
      status: "ACTIVE",
      matchedAt: new Date(),
      expiresAt,
      platformFee: feeRule ? feeRule.fee : null,
      transactionFee: feeRule ? feeRule.transactionFee : null,
    },
  });

  // Debit host wallet
  const hostTx = await debitWallet({
    userId: hostId,
    amount: wagerAmount,
    type: "CHALLENGE_WAGER",
    description: `Host wager (admin-created challenge, KES ${wagerAmount.toFixed(2)})`,
    challengeId: challenge.id,
  });

  // Debit challenger wallet — if this fails, refund the host and remove the challenge
  let challengerTx;
  try {
    challengerTx = await debitWallet({
      userId: challengerId,
      amount: wagerAmount,
      type: "CHALLENGE_WAGER",
      description: `Challenger wager (admin-created challenge, KES ${wagerAmount.toFixed(2)})`,
      challengeId: challenge.id,
    });
  } catch (err) {
    await creditWallet({
      userId: hostId,
      amount: wagerAmount,
      type: "ADMIN_ADJUSTMENT",
      description: `Refund: admin challenge creation failed`,
      challengeId: challenge.id,
    });
    await prisma.challenge.delete({ where: { id: challenge.id } });
    const msg = err instanceof Error ? err.message : "Failed to debit challenger";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Log admin action
  await prisma.adminAction.create({
    data: {
      adminId: adminUser.id,
      action: "CHALLENGE_ADMIN_CREATED",
      note: `Created ${format} challenge between ${host.username} (host) and ${challenger.username} (challenger) for KES ${wagerAmount}`,
      metadata: { challengeId: challenge.id, hostId, challengerId, wagerAmount },
    },
  });

  // Notify both parties
  await Promise.all([
    createNotification(hostId, "CHALLENGE_ACCEPTED", {
      title: "You've been entered into a challenge!",
      body: `An admin created a ${format.replace(/_/g, " ")} challenge for you vs ${challenger.displayName ?? challenger.username}. KES ${wagerAmount.toFixed(2)} debited from your wallet.`,
      linkUrl: `/challenges/${challenge.id}`,
    }),
    createNotification(challengerId, "CHALLENGE_ACCEPTED", {
      title: "You've been entered into a challenge!",
      body: `An admin created a ${format.replace(/_/g, " ")} challenge for you vs ${host.displayName ?? host.username}. KES ${wagerAmount.toFixed(2)} debited from your wallet.`,
      linkUrl: `/challenges/${challenge.id}`,
    }),
  ]);

  emitWalletUpdate(hostId, Number(hostTx.balanceAfter));
  emitWalletUpdate(challengerId, Number(challengerTx.balanceAfter));

  emitToast(hostId, {
    type: "info",
    title: "Entered into a challenge!",
    message: `Admin matched you vs ${challenger.displayName ?? challenger.username}. KES ${wagerAmount.toFixed(2)} debited.`,
    linkUrl: `/challenges/${challenge.id}`,
    linkLabel: "Go to challenge →",
    duration: 0,
  });
  emitToast(challengerId, {
    type: "info",
    title: "Entered into a challenge!",
    message: `Admin matched you vs ${host.displayName ?? host.username}. KES ${wagerAmount.toFixed(2)} debited.`,
    linkUrl: `/challenges/${challenge.id}`,
    linkLabel: "Go to challenge →",
    duration: 0,
  });

  emitChallengeUpdate(hostId, challengerId, challenge.id);

  return NextResponse.json({ challenge }, { status: 201 });
}
