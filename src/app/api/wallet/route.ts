import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    transactions,
  });
}
