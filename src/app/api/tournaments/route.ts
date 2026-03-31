import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { not: "DRAFT" } },
    include: { _count: { select: { participants: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tournaments });
}
