import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let admin;
  try {
    admin = await requirePermission("MANAGE_LISTINGS");
  } catch {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const body = await req.json();
  const { action, reason } = body as { action: string; reason?: string };

  if (action === "approve") {
    await prisma.listing.update({
      where: { id },
      data: { status: "ACTIVE", approvedAt: new Date(), approvedBy: admin.id },
    });
    await prisma.adminAction.create({
      data: { adminId: admin.id, targetListingId: id, action: "APPROVE_LISTING" },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "remove") {
    await prisma.listing.update({
      where: { id },
      data: { status: "REMOVED", removalReason: reason ?? "Removed by admin" },
    });
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        targetListingId: id,
        action: "REMOVE_LISTING",
        note: reason,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
