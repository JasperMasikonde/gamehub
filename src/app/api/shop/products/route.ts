import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const featured = searchParams.get("featured") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(48, parseInt(searchParams.get("pageSize") ?? "24"));

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (featured) where.isFeatured = true;
  if (type) where.type = type;
  if (category) where.category = { slug: category };
  if (search) where.name = { contains: search, mode: "insensitive" };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, pageSize });
}
