import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await prisma.shopOrder.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { shippingName, shippingLine1, shippingCity, shippingCountry, shippingPostal } = body;

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0)
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  for (const item of cart.items) {
    if (item.product.stock !== -1 && item.product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${item.product.name}` },
        { status: 400 }
      );
    }
  }

  const total = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  const order = await prisma.$transaction(async (tx) => {
    for (const item of cart.items) {
      if (item.product.stock !== -1) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }
    const newOrder = await tx.shopOrder.create({
      data: {
        userId: session.user.id,
        total,
        status: "PENDING_PAYMENT",
        shippingName: shippingName || null,
        shippingLine1: shippingLine1 || null,
        shippingCity: shippingCity || null,
        shippingCountry: shippingCountry || null,
        shippingPostal: shippingPostal || null,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            unitPrice: item.product.price,
            quantity: item.quantity,
            subtotal: Number(item.product.price) * item.quantity,
          })),
        },
      },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return newOrder;
  });

  return NextResponse.json({ order }, { status: 201 });
}
