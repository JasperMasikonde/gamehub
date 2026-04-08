import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role"); // "client" | "provider"

  const userId = session.user.id;

  if (role === "client") {
    const orders = await prisma.rankPushOrder.findMany({
      where: { clientId: userId },
      include: {
        listing: { select: { id: true, title: true } },
        provider: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  }

  if (role === "provider") {
    const orders = await prisma.rankPushOrder.findMany({
      where: { providerId: userId },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  }

  // No role param — return both
  const [clientOrders, providerOrders] = await Promise.all([
    prisma.rankPushOrder.findMany({
      where: { clientId: userId },
      include: {
        listing: { select: { id: true, title: true } },
        provider: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rankPushOrder.findMany({
      where: { providerId: userId },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ clientOrders, providerOrders });
}
