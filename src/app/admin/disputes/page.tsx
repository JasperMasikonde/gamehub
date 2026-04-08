import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Card } from "@/components/ui/Card";
import { DisputeStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { AlertTriangle, Swords } from "lucide-react";

export default async function AdminDisputesPage() {
  const [disputes, challengeDisputes] = await Promise.all([
    // Escrow disputes
    prisma.dispute.findMany({
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
    }),
    // Challenge disputes — no Dispute record exists, just status="DISPUTED"
    prisma.challenge.findMany({
      where: { status: "DISPUTED" },
      orderBy: { updatedAt: "desc" },
      include: {
        host: { select: { username: true } },
        challenger: { select: { username: true } },
      },
    }),
  ]);

  const openEscrow = disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle size={20} className="text-neon-red" /> Disputes
        </h1>
        <p className="text-sm text-text-muted">
          {openEscrow} open escrow · {challengeDisputes.length} challenge{challengeDisputes.length !== 1 ? "s" : ""} disputed
        </p>
      </div>

      {/* Challenge disputes */}
      {challengeDisputes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neon-red flex items-center gap-1.5 mb-2">
            <Swords size={14} /> Challenge Result Conflicts
          </h2>
          <div className="flex flex-col gap-2">
            {challengeDisputes.map((c) => (
              <Link
                key={c.id}
                href={`/admin/challenges/${c.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-neon-red/30 bg-neon-red/5 hover:bg-neon-red/10 transition-colors"
              >
                <AlertTriangle size={16} className="text-neon-red shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {c.host.username} vs {c.challenger?.username ?? "—"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {c.format === "BEST_OF_3" ? "Best of 3" : "Best of 5"} · Wager{" "}
                    {formatCurrency(c.wagerAmount.toString())} each · Prize{" "}
                    {formatCurrency((Number(c.wagerAmount) * 2).toString())}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-neon-red">Conflicting results</p>
                  <p className="text-xs text-text-muted mt-0.5">{formatDate(c.updatedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Escrow disputes */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-2">
          <AlertTriangle size={14} className="text-neon-red" /> Escrow Disputes
        </h2>
        <Card>
          <div className="divide-y divide-bg-border">
            {disputes.length === 0 && (
              <p className="text-center text-sm text-text-muted py-8">No escrow disputes</p>
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
    </div>
  );
}
