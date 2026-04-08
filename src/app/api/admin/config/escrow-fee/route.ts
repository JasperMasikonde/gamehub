import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const rate = parseFloat(body.platformFeeRate);
  if (isNaN(rate) || rate < 0 || rate > 1) {
    return NextResponse.json({ error: "Rate must be between 0 and 1" }, { status: 400 });
  }

  const config = await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", platformFeeRate: rate },
    update: { platformFeeRate: rate },
  });

  return NextResponse.json({ platformFeeRate: Number(config.platformFeeRate) });
}
