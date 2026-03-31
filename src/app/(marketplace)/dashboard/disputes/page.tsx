import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { DisputeStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default async function DisputesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const disputes = await prisma.dispute.findMany({
    where: { raisedById: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      transaction: {
        include: {
          listing: { select: { title: true } },
          seller: { select: { username: true, displayName: true } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <AlertTriangle size={20} className="text-neon-red" /> My Disputes
      </h1>

      {disputes.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No disputes raised</p>
          <p className="text-sm mt-1">Disputes appear here when you raise one on a transaction</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {disputes.map((d) => (
            <Link key={d.id} href={`/dashboard/escrow/${d.transactionId}`}>
              <Card hover>
                <CardContent className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {d.transaction.listing.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Seller: {d.transaction.seller.displayName ?? d.transaction.seller.username}
                    </p>
                    <p className="text-xs text-text-subtle mt-1 line-clamp-1">{d.reason}</p>
                    {d.resolution && (
                      <p className="text-xs text-neon-green mt-1 line-clamp-1">
                        Resolution: {d.resolution}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <DisputeStatusPill status={d.status} />
                    <span className="text-xs font-medium text-neon-green">
                      {formatCurrency(d.transaction.amount.toString())}
                    </span>
                    <span className="text-xs text-text-muted">{formatDate(d.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
