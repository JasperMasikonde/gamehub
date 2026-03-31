import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/escrow-requests/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const escrowRequest = await prisma.escrowRequest.findUnique({
    where: { id },
    include: {
      initiator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      counterparty: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  if (!escrowRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the two parties can view
  if (
    escrowRequest.initiatorId !== session.user.id &&
    escrowRequest.counterpartyId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ escrowRequest });
}
