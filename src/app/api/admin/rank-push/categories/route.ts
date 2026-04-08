import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return e as Response;
  }

  const categories = await prisma.rankPushCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return e as Response;
  }

  const body = await req.json();
  const { name, sortOrder } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await prisma.rankPushCategory.create({
    data: {
      name,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
