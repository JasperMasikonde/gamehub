import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { TransactionStatus } from "@prisma/client";

// This route is called by a cron job / scheduler to auto-complete transactions
// whose confirmation deadline has passed without buyer action.
// Protect with a shared secret in production.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overdue = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.DELIVERED,
      confirmationDeadline: { lt: new Date() },
    },
  });

  const results = await Promise.allSettled(
    overdue.map((tx) =>
      transitionTransaction(tx.id, TransactionStatus.COMPLETED, "cron")
    )
  );

  const completed = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ processed: overdue.length, completed });
}
