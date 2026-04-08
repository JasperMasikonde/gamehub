import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("MANAGE_RANK_PUSH");
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json();
  const { name, sortOrder, isActive } = body;

  const category = await prisma.rankPushCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json({ category });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("MANAGE_RANK_PUSH");
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;

  await prisma.rankPushCategory.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
