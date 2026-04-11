import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { debitWallet, getWalletBalance } from "@/lib/wallet";

const schema = z.object({
  amount: z.number().positive().min(1),
  phone: z.string().min(9).max(15),
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

  const { amount, phone } = parsed.data;
  const userId = session.user.id;

  // Check for pending payout request already
  const existing = await prisma.payoutRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending payout request." },
      { status: 400 }
    );
  }

  const balance = await getWalletBalance(userId);
  if (balance < amount) {
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });
  }

  // Create payout request and debit wallet atomically
  const payoutRequest = await prisma.payoutRequest.create({
    data: { userId, amount, phone },
  });

  await debitWallet({
    userId,
    amount,
    type: "PAYOUT",
    description: `Payout request KES ${amount} to ${phone}`,
    payoutId: payoutRequest.id,
  });

  return NextResponse.json({ payoutRequest });
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
