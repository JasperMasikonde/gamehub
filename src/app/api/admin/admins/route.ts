import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitToast, emitRoleUpdated } from "@/lib/socket-server";
import { createNotification } from "@/lib/notifications";

// GET — list all admins (excluding super admin) + all promotable users
export async function GET(req: NextRequest) {
  await requireSuperAdmin();

  const { searchParams } = new URL(req.url);

  if (searchParams.get("type") === "users") {
    // All non-admin, non-super-admin users for the picker
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true, username: true, email: true },
      orderBy: { username: "asc" },
    });
    return NextResponse.json(users);
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isSuperAdmin: false, isAgent: false },
    select: {
      id: true,
      username: true,
      email: true,
      adminPermissions: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(admins);
}

const promoteSchema = z.object({
  email: z.string().email(),
});

// POST — promote a user to admin
export async function POST(req: NextRequest) {
  await requireSuperAdmin();

  const body = await req.json();
  const parsed = promoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.isSuperAdmin) return NextResponse.json({ error: "Cannot modify super admin" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { email: parsed.data.email },
    data: { role: "ADMIN", adminPermissions: [] },
    select: { id: true, username: true, email: true, adminPermissions: true, createdAt: true },
  });

  // Notify the newly promoted user in real-time
  await createNotification(updated.id, "ADMIN_PROMOTED", {
    title: "You've been promoted to Admin",
    body: "You now have admin access. Your session is refreshing automatically.",
    linkUrl: "/admin",
  });
  emitToast(updated.id, {
    type: "success",
    title: "You're now an Admin!",
    message: "Your access has been updated. The admin panel is now available.",
    linkUrl: "/admin",
    linkLabel: "Open Admin Panel →",
    duration: 0,
  });
  // Trigger a session refresh so the admin panel becomes available immediately
  emitRoleUpdated(updated.id);

  return NextResponse.json(updated);
}
