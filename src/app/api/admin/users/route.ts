import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users?search=<term>&limit=<n>
export async function GET(req: NextRequest) {
  try {
    await requirePermission("MANAGE_USERS");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { displayName: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, displayName: true, email: true, role: true },
  });

  return NextResponse.json({ users });
}
