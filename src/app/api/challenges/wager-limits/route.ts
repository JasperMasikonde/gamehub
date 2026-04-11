import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    minWagerAmount: Number(config?.minWagerAmount ?? 0),
    maxWagerAmount: config?.maxWagerAmount ? Number(config.maxWagerAmount) : null,
  });
}
