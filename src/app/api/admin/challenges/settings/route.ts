import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  matchCodePattern: z.string().min(1).max(500),
  matchCodeHint: z.string().min(1).max(200),
});

// PATCH /api/admin/challenges/settings
export async function PATCH(req: NextRequest) {
  await requireAdmin();

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: msg ?? "Invalid input" }, { status: 400 });
  }

  // Validate that the regex is actually valid before saving
  try {
    new RegExp(parsed.data.matchCodePattern);
  } catch {
    return NextResponse.json({ error: "Invalid regular expression" }, { status: 400 });
  }

  const config = await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    update: {
      matchCodePattern: parsed.data.matchCodePattern,
      matchCodeHint: parsed.data.matchCodeHint,
    },
    create: {
      id: "singleton",
      matchCodePattern: parsed.data.matchCodePattern,
      matchCodeHint: parsed.data.matchCodeHint,
    },
  });

  return NextResponse.json({
    pattern: config.matchCodePattern,
    hint: config.matchCodeHint,
  });
}
