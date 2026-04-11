import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("MANAGE_FEES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.platformFeeRule.findMany({
    orderBy: { minWager: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("MANAGE_FEES");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { label, minWager, maxWager, fee, transactionFee, isActive } = body;

  if (!label || minWager == null || maxWager == null || fee == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (Number(minWager) >= Number(maxWager)) {
    return NextResponse.json({ error: "minWager must be less than maxWager" }, { status: 400 });
  }

  const rule = await prisma.platformFeeRule.create({
    data: {
      label,
      minWager,
      maxWager,
      fee,
      transactionFee: transactionFee ?? 0,
      isActive: isActive ?? true,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
