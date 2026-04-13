import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitWalletUpdate, emitToast } from "@/lib/socket-server";

const schema = z.object({
  type: z.enum(["credit", "debit"]),
  amount: z.number().positive().max(1_000_000),
  note: z.string().min(3, "Note must be at least 3 characters").max(300),
});

// GET — current wallet balance + recent transactions for a user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    balance: wallet ? Number(wallet.balance) : 0,
    transactions: transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

// POST — credit or debit a user's wallet (admin only, atomic)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  let adminUser: { id: string; username: string };
  try { adminUser = await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { type, amount, note } = parsed.data;

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Execute atomically
  const { newBalance } = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    const current = wallet ? Number(wallet.balance) : 0;

    if (type === "debit" && current < amount) {
      throw new Error(`Insufficient balance — current: KES ${current.toFixed(2)}`);
    }

    const updated = await tx.wallet.upsert({
      where: { userId },
      create: { userId, balance: type === "credit" ? amount : -amount },
      update: {
        balance: type === "credit" ? { increment: amount } : { decrement: amount },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        type: "ADMIN_ADJUSTMENT",
        amount,
        balanceAfter: updated.balance,
        description: `Admin ${type} by ${adminUser.username}: ${note}`,
      },
    });

    // Log admin action
    await tx.adminAction.create({
      data: {
        adminId: adminUser.id,
        targetUserId: userId,
        action: `WALLET_${type.toUpperCase()}`,
        note: `KES ${amount.toFixed(2)} — ${note}`,
      },
    });

    return { newBalance: Number(updated.balance) };
  }).catch((err: Error) => {
    throw err;
  });

  // Push live balance update to the user
  emitWalletUpdate(userId, newBalance);

  // Toast to the user
  emitToast(userId, {
    type: type === "credit" ? "success" : "info",
    title: type === "credit" ? "Wallet credited" : "Wallet adjusted",
    message: `${type === "credit" ? "+" : "-"}KES ${amount.toFixed(2)} — ${note}. New balance: KES ${newBalance.toFixed(2)}`,
    duration: 8000,
  });

  return NextResponse.json({ balance: newBalance });
}
