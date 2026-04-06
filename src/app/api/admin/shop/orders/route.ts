import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const orders = await prisma.shopOrder.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      user: { select: { id: true, username: true, displayName: true, email: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}
