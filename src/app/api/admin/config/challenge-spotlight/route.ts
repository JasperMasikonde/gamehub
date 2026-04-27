import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try { await requirePermission("MANAGE_CHALLENGES"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { enabled } = await req.json();
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const config = await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    update: { showChallengeSpotlight: enabled },
    create: { id: "singleton", showChallengeSpotlight: enabled },
  });

  return NextResponse.json({ showChallengeSpotlight: config.showChallengeSpotlight });
}
