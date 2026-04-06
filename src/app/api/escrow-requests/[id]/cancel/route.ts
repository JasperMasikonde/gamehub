import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEscrowRequestUpdate } from "@/lib/socket-server";

// POST /api/escrow-requests/[id]/cancel — initiator cancels
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const escrowReq = await prisma.escrowRequest.findUnique({ where: { id } });
  if (!escrowReq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (escrowReq.initiatorId !== session.user.id)
    return NextResponse.json({ error: "Only the initiator can cancel" }, { status: 403 });
  if (escrowReq.status !== "PENDING")
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 });

  await prisma.escrowRequest.update({ where: { id }, data: { status: "CANCELLED" } });

  emitEscrowRequestUpdate(escrowReq.initiatorId, escrowReq.counterpartyId, id);

  return NextResponse.json({ ok: true });
}
