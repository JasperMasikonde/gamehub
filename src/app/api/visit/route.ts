import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 64) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    await prisma.siteVisit.upsert({
      where: { sessionId_date: { sessionId, date } },
      update: {},
      create: { sessionId, date },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
