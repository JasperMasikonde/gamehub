import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { querySTKPush } from "@/lib/ncba";
import { claimAndFulfill } from "@/lib/payment-fulfillment";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return cached terminal state immediately
  if (payment.status === "COMPLETED") return NextResponse.json({ status: "COMPLETED" });
  if (payment.status === "FAILED") {
    return NextResponse.json({ status: "FAILED", reason: payment.failureReason });
  }

  if (!payment.ncbaTransactionId) {
    return NextResponse.json({ status: "PENDING" });
  }

  // Query NCBA
  let queryResult;
  try {
    queryResult = await querySTKPush(payment.ncbaTransactionId);
  } catch (err) {
    console.error("[payments/status] NCBA query error:", err);
    return NextResponse.json({ status: "PENDING" });
  }

  // NOTE: Do NOT treat FAILED as a definitive decline — NCBA's query returns
  // FAILED for Fuliza (overdraft) payments even when money is successfully
  // debited. Only mark COMPLETED from the query; rely on the push notification
  // callback for confirmed failures.
  if (queryResult.status === "SUCCESS") {
    // claimAndFulfill does the atomic status flip + fulfillment.
    // Returns false if the callback already claimed it — we still
    // return COMPLETED to the client because the payment is done.
    await claimAndFulfill(payment);
    return NextResponse.json({ status: "COMPLETED" });
  }

  // Non-success from query: advance to PROCESSING so we don't keep
  // hitting the query endpoint, but don't move to FAILED yet.
  // Use updateMany so we never overwrite a COMPLETED/FAILED set by the callback.
  await prisma.payment.updateMany({
    where: { id, status: { notIn: ["COMPLETED", "FAILED"] } },
    data: { status: "PROCESSING" },
  });
  return NextResponse.json({ status: "PENDING" });
}
