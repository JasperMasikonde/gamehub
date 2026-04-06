import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedItem(itemId: string, userId: string) {
  return prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemId } = await params;
  const { quantity } = await req.json();
  if (typeof quantity !== "number" || quantity < 1)
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  const item = await getOwnedItem(itemId, session.user.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemId } = await params;
  const item = await getOwnedItem(itemId, session.user.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.cartItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
