import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: { include: { category: { select: { name: true } } } } },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  return NextResponse.json({ cart: cart ?? { items: [] } });
}

export async function POST(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, quantity = 1 } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    return NextResponse.json({ error: "quantity must be an integer between 1 and 100" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "ACTIVE")
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (product.stock === 0)
    return NextResponse.json({ error: "Out of stock" }, { status: 400 });

  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE() {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return NextResponse.json({ success: true });
}
