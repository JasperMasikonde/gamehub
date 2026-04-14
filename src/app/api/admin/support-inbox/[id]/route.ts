import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  isRead: z.boolean().optional(),
  repliedAt: z.string().optional(), // ISO string — set when admin sends reply
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await requirePermission("SEND_SUPPORT_EMAIL");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.isRead !== undefined) data.isRead = parsed.data.isRead;
  if (parsed.data.repliedAt) data.repliedAt = new Date(parsed.data.repliedAt);

  await prisma.supportEmail.update({ where: { id }, data });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await requirePermission("SEND_SUPPORT_EMAIL");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.supportEmail.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
