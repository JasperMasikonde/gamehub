import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("MANAGE_FEES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { label, minWager, maxWager, fee, isActive } = body;

  const existing = await prisma.platformFeeRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    minWager != null &&
    maxWager != null &&
    Number(minWager) >= Number(maxWager)
  ) {
    return NextResponse.json({ error: "minWager must be less than maxWager" }, { status: 400 });
  }

  const rule = await prisma.platformFeeRule.update({
    where: { id },
    data: {
      ...(label != null && { label }),
      ...(minWager != null && { minWager }),
      ...(maxWager != null && { maxWager }),
      ...(fee != null && { fee }),
      ...(isActive != null && { isActive }),
    },
  });

  return NextResponse.json({ rule });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("MANAGE_FEES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.platformFeeRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.platformFeeRule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
