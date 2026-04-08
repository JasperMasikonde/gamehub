import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { formatRelativeTime, formatCurrency } from "@/lib/utils/format";
import { Users, ListOrdered, CreditCard, AlertTriangle, Banknote, Swords } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const [
    userCount,
    listingCount,
    txCount,
    openDisputeCount,
    recentActions,
    pendingEscrowPayouts,
    pendingChallengePayouts,
  ] = await Promise.all([
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
    // Escrow transactions completed — seller needs to be paid
    prisma.transaction.findMany({
      where: { status: "COMPLETED" },
      select: { sellerReceives: true },
    }),
    // Challenges completed — winner needs to be paid
    prisma.challenge.count({ where: { status: "COMPLETED" } }),
  ]);

  const escrowPayoutTotal = pendingEscrowPayouts.reduce(
    (sum, tx) => sum + Number(tx.sellerReceives),
    0
  );

  const stats = [
    { icon: Users, label: "Total Users", value: userCount, color: "text-neon-blue", href: "/admin/users" },
    { icon: ListOrdered, label: "Pending Listings", value: listingCount, color: "text-neon-yellow", href: "/admin/listings" },
    { icon: CreditCard, label: "Active Escrows", value: txCount, color: "text-neon-green", href: "/admin/transactions" },
    { icon: AlertTriangle, label: "Open Disputes", value: openDisputeCount, color: "text-neon-red", href: "/admin/disputes" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-sm text-text-muted">Platform health at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-bg-border/80 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3">
                <s.icon size={22} className={s.color} />
                <div>
                  <p className="text-xs text-text-muted">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Payout alerts */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Pending Payouts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Escrow payouts */}
          <Link href="/admin/transactions?status=COMPLETED">
            <div className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
              ${pendingEscrowPayouts.length > 0
                ? "bg-neon-green/5 border-neon-green/30 hover:bg-neon-green/10"
                : "bg-bg-elevated border-bg-border hover:border-bg-border/80"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${pendingEscrowPayouts.length > 0 ? "bg-neon-green/15" : "bg-bg-surface"}`}>
                <Banknote size={18} className={pendingEscrowPayouts.length > 0 ? "text-neon-green" : "text-text-muted"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">Escrow Payouts</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {pendingEscrowPayouts.length > 0
                    ? `${pendingEscrowPayouts.length} seller${pendingEscrowPayouts.length !== 1 ? "s" : ""} awaiting payment`
                    : "No pending payouts"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-black ${pendingEscrowPayouts.length > 0 ? "text-neon-green" : "text-text-muted"}`}>
                  {pendingEscrowPayouts.length}
                </p>
                {pendingEscrowPayouts.length > 0 && (
                  <p className="text-xs text-text-muted">{formatCurrency(escrowPayoutTotal.toString())}</p>
                )}
              </div>
            </div>
          </Link>

          {/* Challenge payouts */}
          <Link href="/admin/challenges?status=COMPLETED">
            <div className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
              ${pendingChallengePayouts > 0
                ? "bg-neon-purple/5 border-neon-purple/30 hover:bg-neon-purple/10"
                : "bg-bg-elevated border-bg-border hover:border-bg-border/80"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${pendingChallengePayouts > 0 ? "bg-neon-purple/15" : "bg-bg-surface"}`}>
                <Swords size={18} className={pendingChallengePayouts > 0 ? "text-neon-purple" : "text-text-muted"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">Challenge Payouts</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {pendingChallengePayouts > 0
                    ? `${pendingChallengePayouts} winner${pendingChallengePayouts !== 1 ? "s" : ""} awaiting payment`
                    : "No pending payouts"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-black ${pendingChallengePayouts > 0 ? "text-neon-purple" : "text-text-muted"}`}>
                  {pendingChallengePayouts}
                </p>
              </div>
            </div>
          </Link>
        </div>
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
