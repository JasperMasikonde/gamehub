import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  variant:      z.enum(["ANNOUNCEMENT", "HERO", "FEATURE"]),
  title:        z.string().min(1).max(120),
  subtitle:     z.string().max(300).optional().nullable(),
  badgeText:    z.string().max(40).optional().nullable(),
  ctaLabel:     z.string().max(40).default("View Tournament"),
  ctaUrl:       z.string().max(300).default("/tournaments"),
  accentColor:  z.enum(["GREEN", "BLUE", "PURPLE", "YELLOW", "RED"]).default("GREEN"),
  countdownTo:  z.string().datetime().optional().nullable(),
  tournamentId: z.string().optional().nullable(),
  isActive:     z.boolean().default(false),
});

export async function GET() {
  try { await requirePermission("MANAGE_TOURNAMENTS"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const banners = await prisma.promoBanner.findMany({
    orderBy: { createdAt: "desc" },
    include: { tournament: { select: { id: true, name: true, slug: true } } },
  });
  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  try { await requirePermission("MANAGE_TOURNAMENTS"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: msg ?? "Invalid input" }, { status: 400 });
  }

  const { countdownTo, tournamentId, ...rest } = parsed.data;
  const banner = await prisma.promoBanner.create({
    data: {
      ...rest,
      countdownTo: countdownTo ? new Date(countdownTo) : null,
      tournamentId: tournamentId || null,
    },
    include: { tournament: { select: { id: true, name: true, slug: true } } },
  });
  return NextResponse.json({ banner }, { status: 201 });
}
