import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/challenges/fee?wager=500
export async function GET(req: NextRequest) {
  const wagerParam = req.nextUrl.searchParams.get("wager");
  if (!wagerParam) {
    return NextResponse.json({ error: "Missing wager query param" }, { status: 400 });
  }

  const wager = parseFloat(wagerParam);
  if (isNaN(wager) || wager <= 0) {
    return NextResponse.json({ error: "Invalid wager amount" }, { status: 400 });
  }

  const rule = await prisma.platformFeeRule.findFirst({
    where: {
      isActive: true,
      minWager: { lte: wager },
      maxWager: { gte: wager },
    },
    orderBy: { minWager: "asc" },
  });

  if (!rule) {
    return NextResponse.json({ fee: null, rule: null });
  }

  return NextResponse.json({
    fee: Number(rule.fee),
    rule: {
      id: rule.id,
      label: rule.label,
      minWager: Number(rule.minWager),
      maxWager: Number(rule.maxWager),
      fee: Number(rule.fee),
    },
  });
}
