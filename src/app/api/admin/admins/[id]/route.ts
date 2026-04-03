import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPermission } from "@prisma/client";
import { z } from "zod";

const permissionsSchema = z.object({
  adminPermissions: z.array(z.nativeEnum(AdminPermission)),
});

// PATCH — update permissions for an admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { isSuperAdmin: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.isSuperAdmin) return NextResponse.json({ error: "Cannot modify super admin" }, { status: 400 });

  const body = await req.json();
  const parsed = permissionsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id },
    data: { adminPermissions: parsed.data.adminPermissions },
    select: { id: true, username: true, email: true, adminPermissions: true },
  });

  return NextResponse.json(updated);
}

// DELETE — demote admin back to buyer
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { isSuperAdmin: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.isSuperAdmin) return NextResponse.json({ error: "Cannot demote super admin" }, { status: 400 });

  await prisma.user.update({
    where: { id },
    data: { role: "BUYER", adminPermissions: [] },
  });

  return NextResponse.json({ ok: true });
}
