import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  adminNotificationEmail: z.string().email().or(z.literal("")).nullable(),
});

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ adminNotificationEmail: config?.adminNotificationEmail ?? null });
}

export async function PATCH(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const email = parsed.data.adminNotificationEmail || null;

  const config = await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", adminNotificationEmail: email },
    update: { adminNotificationEmail: email },
  });

  return NextResponse.json({ adminNotificationEmail: config.adminNotificationEmail });
}
