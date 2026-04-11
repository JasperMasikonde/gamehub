import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try { await requirePermission("MANAGE_CHALLENGES"); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ challengeResultWindowMinutes: config?.challengeResultWindowMinutes ?? 60 });
}

export async function PATCH(req: NextRequest) {
  try { await requirePermission("MANAGE_CHALLENGES"); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { minutesWindow?: unknown };
  const minutes = Number(body.minutesWindow);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 10080) {
    return NextResponse.json(
      { error: "Window must be between 5 and 10080 minutes (1 week)" },
      { status: 400 }
    );
  }

  const config = await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", challengeResultWindowMinutes: minutes },
    update: { challengeResultWindowMinutes: minutes },
  });

  return NextResponse.json({ challengeResultWindowMinutes: config.challengeResultWindowMinutes });
}
