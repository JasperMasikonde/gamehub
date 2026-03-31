import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validations/shop";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { imageKeys = [], tags = [], isFeatured = false, status = "DRAFT", ...rest } = parsed.data;
  const product = await prisma.product.create({ data: { ...rest, imageKeys, tags, isFeatured, status } });
  return NextResponse.json({ product }, { status: 201 });
}
