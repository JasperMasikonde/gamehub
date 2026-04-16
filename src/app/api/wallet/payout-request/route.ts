import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitWalletUpdate } from "@/lib/socket-server";
import { sendAdminNotification } from "@/lib/email";

const schema = z.object({
  amount: z.number().positive().min(50, "Minimum payout is KES 50"),
  phone: z.string().min(9).max(15),
  challengeId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { amount, phone, challengeId } = parsed.data;
  const userId = session.user.id;

  // Check for already-pending request
  const existing = await prisma.payoutRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending payout request." },
      { status: 400 }
    );
  }

  // Atomic: check balance, create request, debit wallet — all in one transaction
  let newBalance: number;
  let payoutRequest: { id: string; amount: number; phone: string; status: string };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      const balance = wallet ? Number(wallet.balance) : 0;

      if (balance < amount) {
        throw new Error("Insufficient wallet balance");
      }

      const req = await tx.payoutRequest.create({
        data: { userId, amount, phone, ...(challengeId ? { challengeId } : {}) },
      });

      const updated = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: "PAYOUT",
          amount,
          balanceAfter: updated.balance,
          description: `Payout request KES ${amount} to ${phone}`,
          payoutId: req.id,
        },
      });

      return {
        payoutRequest: { id: req.id, amount: Number(req.amount), phone: req.phone, status: req.status },
        newBalance: Number(updated.balance),
      };
    });

    newBalance = result.newBalance;
    payoutRequest = result.payoutRequest;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payout request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Push live balance to user's browser
  emitWalletUpdate(userId, newBalance);

  // Notify admin by email (fire-and-forget)
  (async () => {
    try {
      const [config, requester] = await Promise.all([
        prisma.siteConfig.findUnique({ where: { id: "singleton" } }),
        prisma.user.findUnique({ where: { id: userId }, select: { username: true, email: true } }),
      ]);
      const adminEmail = config?.adminNotificationEmail;
      if (!adminEmail) return;
      const challengeLink = challengeId ? `/admin/challenges/${challengeId}` : "/admin/payouts";
      await sendAdminNotification({
        toEmail: adminEmail,
        subject: "New Payout Request",
        eventTitle: "A user has requested a payout",
        eventBody: `User: ${requester?.username ?? userId} (${requester?.email ?? ""})\nAmount: KES ${Number(amount).toFixed(2)}\nPhone: ${phone}${challengeId ? `\nChallenge: ${challengeId}` : ""}`,
        linkUrl: challengeLink,
        linkLabel: "View →",
      });
    } catch { /* ignore email errors */ }
  })();

  return NextResponse.json({ payoutRequest, balance: newBalance });
}

export async function GET() {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.payoutRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ requests });
}
