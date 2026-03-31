import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCategorySchema } from "@/lib/validations/shop";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  const category = await prisma.productCategory.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ category });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.productCategory.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
