import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitEscrowRequestUpdate } from "@/lib/socket-server";

// POST /api/escrow-requests/[id]/reject — counterparty rejects
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const escrowReq = await prisma.escrowRequest.findUnique({ where: { id } });
  if (!escrowReq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (escrowReq.counterpartyId !== session.user.id)
    return NextResponse.json({ error: "Only the counterparty can reject" }, { status: 403 });
  if (escrowReq.status !== "PENDING")
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 });

  await prisma.escrowRequest.update({ where: { id }, data: { status: "REJECTED" } });

  await createNotification(escrowReq.initiatorId, "ESCROW_REQUEST_REJECTED", {
    title: "Escrow request declined",
    body: `Your escrow request "${escrowReq.title}" was declined.`,
    linkUrl: `/escrow-requests/${id}`,
  });
  emitToast(escrowReq.initiatorId, {
    type: "warning",
    title: "Escrow request declined",
    message: `"${escrowReq.title}" was declined by the other party.`,
    linkUrl: `/escrow-requests/${id}`,
  });

  emitEscrowRequestUpdate(escrowReq.initiatorId, escrowReq.counterpartyId, id);

  return NextResponse.json({ ok: true });
}
