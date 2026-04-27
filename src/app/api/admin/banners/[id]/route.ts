import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  variant:      z.enum(["ANNOUNCEMENT", "HERO", "FEATURE"]).optional(),
  title:        z.string().min(1).max(120).optional(),
  subtitle:     z.string().max(300).nullable().optional(),
  badgeText:    z.string().max(40).nullable().optional(),
  ctaLabel:     z.string().max(40).optional(),
  ctaUrl:       z.string().max(300).optional(),
  accentColor:  z.enum(["GREEN", "BLUE", "PURPLE", "YELLOW", "RED"]).optional(),
  countdownTo:  z.string().datetime().nullable().optional(),
  tournamentId: z.string().nullable().optional(),
  isActive:     z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requirePermission("MANAGE_TOURNAMENTS"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: msg ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.promoBanner.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { countdownTo, tournamentId, ...rest } = parsed.data;
  const banner = await prisma.promoBanner.update({
    where: { id },
    data: {
      ...rest,
      ...(countdownTo !== undefined && { countdownTo: countdownTo ? new Date(countdownTo) : null }),
      ...(tournamentId !== undefined && { tournamentId: tournamentId || null }),
    },
    include: { tournament: { select: { id: true, name: true, slug: true } } },
  });
  return NextResponse.json({ banner });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try { await requirePermission("MANAGE_TOURNAMENTS"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { id } = await params;
  const existing = await prisma.promoBanner.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.promoBanner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
