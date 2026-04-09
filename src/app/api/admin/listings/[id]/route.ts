import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendListingApprovedEmail, sendListingRemovedEmail } from "@/lib/email";

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
    const listing = await prisma.listing.update({
      where: { id },
      data: { status: "ACTIVE", approvedAt: new Date(), approvedBy: admin.id },
      include: { seller: { select: { email: true, username: true, displayName: true } } },
    });
    await prisma.adminAction.create({
      data: { adminId: admin.id, targetListingId: id, action: "APPROVE_LISTING" },
    });
    sendListingApprovedEmail({
      toEmail: listing.seller.email,
      toName: listing.seller.displayName ?? listing.seller.username,
      listingTitle: listing.title,
      listingId: listing.id,
    }).catch((e) => console.error("[email] listing approved:", e));
    return NextResponse.json({ success: true });
  }

  if (action === "remove") {
    const listing = await prisma.listing.update({
      where: { id },
      data: { status: "REMOVED", removalReason: reason ?? "Removed by admin" },
      include: { seller: { select: { email: true, username: true, displayName: true } } },
    });
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        targetListingId: id,
        action: "REMOVE_LISTING",
        note: reason,
      },
    });
    sendListingRemovedEmail({
      toEmail: listing.seller.email,
      toName: listing.seller.displayName ?? listing.seller.username,
      listingTitle: listing.title,
      reason,
    }).catch((e) => console.error("[email] listing removed:", e));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
