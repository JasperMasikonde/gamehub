import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/challenges/delete-demo
 *
 * Hard-deletes all challenges tagged with adminNote = "DEMO_SEED".
 * No refunds or emails — these are fake seeded records with no real payments.
 */
export async function DELETE() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await prisma.challenge.deleteMany({
    where: { adminNote: "DEMO_SEED" },
  });

  return NextResponse.json({ deleted: count });
}
