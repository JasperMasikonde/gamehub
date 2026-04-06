import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPermission } from "@prisma/client";
import { z } from "zod";

const permissionsSchema = z.object({
  adminPermissions: z.array(z.nativeEnum(AdminPermission)),
});

// PATCH — update permissions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const agent = await prisma.user.findUnique({ where: { id }, select: { isAgent: true } });
  if (!agent?.isAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await req.json();
  const parsed = permissionsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id },
    data: { adminPermissions: parsed.data.adminPermissions },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      adminPermissions: true,
      agentHostUrl: true,
      agentStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

// DELETE — permanently remove the agent
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const agent = await prisma.user.findUnique({ where: { id }, select: { isAgent: true } });
  if (!agent?.isAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
