import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { formatRelativeTime } from "@/lib/utils/format";
import { Users, ListOrdered, CreditCard, AlertTriangle } from "lucide-react";

export default async function AdminOverviewPage() {
  const [userCount, listingCount, txCount, openDisputeCount, recentActions] =
    await Promise.all([
      prisma.user.count(),
      prisma.listing.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.transaction.count({ where: { status: "IN_ESCROW" } }),
      prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.adminAction.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          admin: { select: { username: true } },
        },
      }),
    ]);

  const stats = [
    { icon: Users, label: "Total Users", value: userCount, color: "text-neon-blue" },
    { icon: ListOrdered, label: "Pending Listings", value: listingCount, color: "text-neon-yellow" },
    { icon: CreditCard, label: "Active Escrows", value: txCount, color: "text-neon-green" },
    { icon: AlertTriangle, label: "Open Disputes", value: openDisputeCount, color: "text-neon-red" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-sm text-text-muted">Platform health at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3">
              <s.icon size={22} className={s.color} />
              <div>
                <p className="text-xs text-text-muted">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Recent Admin Actions</h2>
        <Card>
          <div className="divide-y divide-bg-border">
            {recentActions.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">No actions yet</p>
            ) : (
              recentActions.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono text-neon-blue">{a.action}</p>
                    {a.note && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                        {a.note}
                      </p>
                    )}
                    <p className="text-xs text-text-muted/60 mt-0.5">
                      by {a.admin.username}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted shrink-0">
                    {formatRelativeTime(a.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
