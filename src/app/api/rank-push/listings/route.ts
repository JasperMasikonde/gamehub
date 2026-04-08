import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("category");

  const listings = await prisma.rankPushListing.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      provider: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerifiedSeller: true,
          rating: true,
        },
      },
      category: { select: { id: true, name: true } },
      _count: {
        select: { orders: { where: { status: "COMPLETED" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always verify isRankPusher from DB (permission field)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isRankPusher: true },
  });

  if (!dbUser?.isRankPusher) {
    return NextResponse.json({ error: "Not a rank pusher" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, categoryId, price } = body;

  if (!title || !categoryId || !price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const priceNum = Number(price);
  if (isNaN(priceNum) || priceNum <= 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const category = await prisma.rankPushCategory.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const listing = await prisma.rankPushListing.create({
    data: {
      providerId: session.user.id,
      categoryId,
      title,
      description: description ?? null,
      price: priceNum,
    },
  });

  return NextResponse.json({ listing }, { status: 201 });
}
