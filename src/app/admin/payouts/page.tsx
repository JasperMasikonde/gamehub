import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminPayoutsTable } from "@/components/admin/AdminPayoutsTable";
import type { SerializedPayoutRequest } from "@/components/admin/AdminPayoutsTable";

export const metadata = { title: "Payout Requests | Admin" };

export default async function AdminPayoutsPage() {
  try {
    await requirePermission("MANAGE_CHALLENGES");
  } catch {
    redirect("/admin");
  }

  const raw = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  // Serialize Decimal → string for client component
  const requests: SerializedPayoutRequest[] = raw.map((r) => ({
    ...r,
    amount: r.amount.toString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Payout Requests</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage user wallet payout requests. Approve, mark as paid, or reject.
        </p>
      </div>
      <AdminPayoutsTable initialRequests={requests} />
    </div>
  );
}
