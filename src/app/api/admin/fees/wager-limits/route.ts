import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  minWagerAmount: z.number().min(0),
  maxWagerAmount: z.number().positive().nullable(),
});

export async function GET() {
  try {
    await requirePermission("MANAGE_FEES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    minWagerAmount: Number(config?.minWagerAmount ?? 0),
    maxWagerAmount: config?.maxWagerAmount ? Number(config.maxWagerAmount) : null,
  });
}

export async function PATCH(req: Request) {
  try {
    await requirePermission("MANAGE_FEES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { minWagerAmount, maxWagerAmount } = parsed.data;
  if (maxWagerAmount !== null && maxWagerAmount <= minWagerAmount) {
    return NextResponse.json({ error: "Max wager must be greater than min wager" }, { status: 400 });
  }

  await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    update: { minWagerAmount, maxWagerAmount },
    create: { id: "singleton", minWagerAmount, maxWagerAmount },
  });

  return NextResponse.json({ success: true });
}
