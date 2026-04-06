import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET — list all admins (excluding super admin) + all promotable users
export async function GET(req: NextRequest) {
  await requireSuperAdmin();

  const { searchParams } = new URL(req.url);

  if (searchParams.get("type") === "users") {
    // All non-admin, non-super-admin users for the picker
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true, username: true, email: true },
      orderBy: { username: "asc" },
    });
    return NextResponse.json(users);
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isSuperAdmin: false, isAgent: false },
    select: {
      id: true,
      username: true,
      email: true,
      adminPermissions: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(admins);
}

const promoteSchema = z.object({
  email: z.string().email(),
});

// POST — promote a user to admin
export async function POST(req: NextRequest) {
  await requireSuperAdmin();

  const body = await req.json();
  const parsed = promoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.isSuperAdmin) return NextResponse.json({ error: "Cannot modify super admin" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { email: parsed.data.email },
    data: { role: "ADMIN", adminPermissions: [] },
    select: { id: true, username: true, email: true, adminPermissions: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
