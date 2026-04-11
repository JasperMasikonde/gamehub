import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/config/match-code-pattern — public, no auth required
export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    pattern: config?.matchCodePattern ?? "^\\d{4}-?\\d{4}$",
    hint: config?.matchCodeHint ?? "8 digits, e.g. 12345678 or 1234-5678",
  });
}
