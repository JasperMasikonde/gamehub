import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TransactionStatusPill, DisputeStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { DisputeResolvePanel } from "@/components/admin/DisputeResolvePanel";
import { EscrowActionPanel } from "@/components/admin/EscrowActionPanel";
import { AlertTriangle, User } from "lucide-react";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      raisedBy: { select: { id: true, username: true, email: true } },
      transaction: {
        include: {
          listing: {
            include: { screenshots: { where: { isCover: true }, take: 1 } },
          },
          buyer: { select: { id: true, username: true, email: true } },
          seller: { select: { id: true, username: true, email: true } },
        },
      },
    },
  });

  if (!dispute) notFound();

  const tx = dispute.transaction;

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle size={18} className="text-neon-red" /> Dispute #{id.slice(-8)}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <DisputeStatusPill status={dispute.status} />
          <TransactionStatusPill status={tx.status} />
        </div>
      </div>

      {/* Listing */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Listing</h2>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {tx.listing.screenshots[0] && (
              <img
                src={tx.listing.screenshots[0].url}
                alt=""
                className="w-24 h-16 object-cover rounded-lg border border-bg-border"
              />
            )}
            <div>
              <p className="text-sm font-medium">{tx.listing.title}</p>
              <p className="text-lg font-bold text-neon-green mt-1">
                {formatCurrency(tx.amount.toString())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parties */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Parties</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-text-muted flex items-center gap-1">
                <User size={11} /> Buyer (raised dispute)
              </p>
              <p className="text-sm font-medium">{tx.buyer.username}</p>
              <p className="text-xs text-text-muted">{tx.buyer.email}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-text-muted flex items-center gap-1">
                <User size={11} /> Seller
              </p>
              <p className="text-sm font-medium">{tx.seller.username}</p>
              <p className="text-xs text-text-muted">{tx.seller.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispute reason */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Buyer&apos;s Complaint</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-subtle leading-relaxed">{dispute.reason}</p>
          {dispute.evidence.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-2">Evidence</p>
              <div className="flex gap-2 flex-wrap">
                {dispute.evidence.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt="Evidence"
                      className="h-20 w-32 object-cover rounded-lg border border-bg-border hover:border-neon-blue transition-colors"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin resolution */}
      {dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW" ? (
        <DisputeResolvePanel disputeId={id} />
      ) : (
        dispute.resolution && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-neon-green">Resolution</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-subtle">{dispute.resolution}</p>
              <p className="text-xs text-text-muted mt-2">
                Resolved {dispute.resolvedAt ? formatDate(dispute.resolvedAt) : ""}
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* Manual escrow control */}
      {["DISPUTED", "IN_ESCROW", "DELIVERED"].includes(tx.status) && (
        <EscrowActionPanel transactionId={tx.id} currentStatus={tx.status} />
      )}
    </div>
  );
}
