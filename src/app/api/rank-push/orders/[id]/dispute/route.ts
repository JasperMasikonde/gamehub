import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitToAdmins } from "@/lib/socket-server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.rankPushOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Can only dispute a delivered order" }, { status: 400 });
  }

  const updated = await prisma.rankPushOrder.update({
    where: { id },
    data: { status: "DISPUTED" },
  });

  // Notify admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification(admin.id, "RANK_PUSH_DISPUTE", {
        title: "Rank push order disputed",
        body: `Order ${id} has been disputed by the client.`,
        linkUrl: `/admin/rank-push/orders`,
      })
    )
  );

  emitToAdmins({
    type: "warning",
    title: "Rank push dispute",
    message: `A client disputed order ${id.slice(-6)}.`,
    linkUrl: `/admin/rank-push/orders`,
    linkLabel: "Review →",
    duration: 15000,
  });

  return NextResponse.json({ order: updated });
}
