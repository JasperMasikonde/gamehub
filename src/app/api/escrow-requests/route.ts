import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitToast } from "@/lib/socket-server";
import { createNotification } from "@/lib/notifications";

const createSchema = z.object({
  counterpartyUsername: z.string().min(1),
  initiatorRole: z.enum(["BUYER", "SELLER"]),
  title: z.string().min(3).max(120),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  sellerScreenshots: z.array(z.string()).optional(),
});

// GET /api/escrow-requests — list my requests (sent + received)
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [sent, received] = await Promise.all([
    prisma.escrowRequest.findMany({
      where: { initiatorId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        counterparty: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.escrowRequest.findMany({
      where: { counterpartyId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        initiator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
  ]);

  return NextResponse.json({ sent, received });
}

// POST /api/escrow-requests — create a new request
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return NextResponse.json(
      { error: firstError ?? "Invalid input", details: fieldErrors },
      { status: 400 }
    );
  }

  const { counterpartyUsername, initiatorRole, title, description, price, sellerScreenshots } = parsed.data;
  const currency = "KES";

  if (initiatorRole === "SELLER" && (!sellerScreenshots || sellerScreenshots.length < 4)) {
    return NextResponse.json(
      { error: "Sellers must upload at least 4 account screenshots (username, squad, reserves, managers)" },
      { status: 400 }
    );
  }

  if (counterpartyUsername.toLowerCase() === session.user.username.toLowerCase()) {
    return NextResponse.json({ error: "You cannot send a request to yourself" }, { status: 400 });
  }

  const counterparty = await prisma.user.findFirst({
    where: { username: { equals: counterpartyUsername, mode: "insensitive" } },
    select: { id: true, username: true },
  });
  if (!counterparty) {
    return NextResponse.json({ error: `User "${counterpartyUsername}" not found` }, { status: 404 });
  }

  // Expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const escrowRequest = await prisma.escrowRequest.create({
    data: {
      initiatorId: session.user.id,
      counterpartyId: counterparty.id,
      initiatorRole,
      title,
      description,
      price,
      currency,
      expiresAt,
      sellerScreenshots: initiatorRole === "SELLER" ? (sellerScreenshots ?? []) : [],
    },
  });

  const counterpartyRole = initiatorRole === "BUYER" ? "seller" : "buyer";

  // Notify counterparty
  await createNotification(counterparty.id, "ESCROW_REQUEST", {
    title: "New Escrow Request",
    body: `${session.user.username} wants you to be the ${counterpartyRole} in an escrow deal: "${title}"`,
    linkUrl: `/escrow-requests/${escrowRequest.id}`,
  });

  emitToast(counterparty.id, {
    type: "deal",
    title: "New Escrow Request",
    message: `${session.user.username} sent you an escrow request for "${title}"`,
    linkUrl: `/escrow-requests/${escrowRequest.id}`,
    linkLabel: "Review →",
  });

  return NextResponse.json({ escrowRequest }, { status: 201 });
}
