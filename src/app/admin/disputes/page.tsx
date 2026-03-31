import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Card } from "@/components/ui/Card";
import { DisputeStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      raisedBy: { select: { username: true } },
      transaction: {
        include: {
          listing: { select: { title: true } },
          seller: { select: { username: true } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle size={20} className="text-neon-red" /> Disputes
        </h1>
        <p className="text-sm text-text-muted">
          {disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW").length} open
        </p>
      </div>

      <Card>
        <div className="divide-y divide-bg-border">
          {disputes.length === 0 && (
            <p className="text-center text-sm text-text-muted py-8">No disputes</p>
          )}
          {disputes.map((d) => (
            <Link
              key={d.id}
              href={`/admin/disputes/${d.id}`}
              className="flex items-start gap-4 px-4 py-3 hover:bg-bg-elevated/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  {d.transaction.listing.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Buyer: {d.raisedBy.username} · Seller: {d.transaction.seller.username}
                </p>
                <p className="text-xs text-text-subtle mt-0.5 line-clamp-1">
                  {d.reason}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <DisputeStatusPill status={d.status} />
                <span className="text-xs text-text-muted">{formatDate(d.createdAt)}</span>
                <span className="text-xs font-medium text-neon-green">
                  {formatCurrency(d.transaction.amount.toString())}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
