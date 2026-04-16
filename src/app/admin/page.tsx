import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { formatRelativeTime, formatCurrency } from "@/lib/utils/format";
import { Users, ListOrdered, CreditCard, AlertTriangle, Banknote, Swords, Eye, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { AdminPermission } from "@prisma/client";

export default async function AdminOverviewPage() {
  const session = await auth();
  const dbUser = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { isSuperAdmin: true, adminPermissions: true },
  });
  const isSuperAdmin = dbUser?.isSuperAdmin ?? false;
  const perms = (dbUser?.adminPermissions ?? []) as AdminPermission[];
  const can = (p: AdminPermission) => isSuperAdmin || perms.includes(p);

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    userCount,
    listingCount,
    txCount,
    openDisputeCount,
    recentActions,
    pendingEscrowPayouts,
    pendingChallengePayouts,
    visitorsToday,
    visitorsThisWeek,
    visitorsThisMonth,
    recentDailyVisits,
  ] = await Promise.all([
    can("MANAGE_USERS") ? prisma.user.count() : Promise.resolve(null),
    can("MANAGE_LISTINGS") ? prisma.listing.count({ where: { status: "PENDING_APPROVAL" } }) : Promise.resolve(null),
    can("MANAGE_TRANSACTIONS") ? prisma.transaction.count({ where: { status: "IN_ESCROW" } }) : Promise.resolve(null),
    can("MANAGE_DISPUTES") ? prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }) : Promise.resolve(null),
    prisma.adminAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { admin: { select: { username: true } } },
    }),
    can("MANAGE_TRANSACTIONS")
      ? prisma.transaction.findMany({ where: { status: "COMPLETED" }, select: { sellerReceives: true } })
      : Promise.resolve(null),
    can("MANAGE_CHALLENGES") ? prisma.challenge.count({ where: { status: "COMPLETED" } }) : Promise.resolve(null),
    prisma.siteVisit.count({ where: { date: today } }),
    prisma.siteVisit.count({ where: { date: { gte: sevenDaysAgo } } }),
    prisma.siteVisit.count({ where: { date: { gte: thirtyDaysAgo } } }),
    prisma.siteVisit.groupBy({
      by: ["date"],
      _count: { id: true },
      where: { date: { gte: sevenDaysAgo } },
      orderBy: { date: "asc" },
    }),
  ]);

  const escrowPayoutTotal = pendingEscrowPayouts
    ? pendingEscrowPayouts.reduce((sum, tx) => sum + Number(tx.sellerReceives), 0)
    : 0;

  const stats = [
    can("MANAGE_USERS") && { icon: Users, label: "Total Users", value: userCount!, color: "text-neon-blue", href: "/admin/users" },
    can("MANAGE_LISTINGS") && { icon: ListOrdered, label: "Pending Listings", value: listingCount!, color: "text-neon-yellow", href: "/admin/listings" },
    can("MANAGE_TRANSACTIONS") && { icon: CreditCard, label: "Active Escrows", value: txCount!, color: "text-neon-green", href: "/admin/transactions" },
    can("MANAGE_DISPUTES") && { icon: AlertTriangle, label: "Open Disputes", value: openDisputeCount!, color: "text-neon-red", href: "/admin/disputes" },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: number; color: string; href: string }[];

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
      {(can("MANAGE_TRANSACTIONS") || can("MANAGE_CHALLENGES")) && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Pending Payouts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Escrow payouts */}
            {can("MANAGE_TRANSACTIONS") && (
              <Link href="/admin/transactions?status=COMPLETED">
                <div className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
                  ${pendingEscrowPayouts!.length > 0
                    ? "bg-neon-green/5 border-neon-green/30 hover:bg-neon-green/10"
                    : "bg-bg-elevated border-bg-border hover:border-bg-border/80"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${pendingEscrowPayouts!.length > 0 ? "bg-neon-green/15" : "bg-bg-surface"}`}>
                    <Banknote size={18} className={pendingEscrowPayouts!.length > 0 ? "text-neon-green" : "text-text-muted"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">Escrow Payouts</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {pendingEscrowPayouts!.length > 0
                        ? `${pendingEscrowPayouts!.length} seller${pendingEscrowPayouts!.length !== 1 ? "s" : ""} awaiting payment`
                        : "No pending payouts"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black ${pendingEscrowPayouts!.length > 0 ? "text-neon-green" : "text-text-muted"}`}>
                      {pendingEscrowPayouts!.length}
                    </p>
                    {pendingEscrowPayouts!.length > 0 && (
                      <p className="text-xs text-text-muted">{formatCurrency(escrowPayoutTotal.toString())}</p>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* Challenge payouts */}
            {can("MANAGE_CHALLENGES") && (
              <Link href="/admin/challenges?status=COMPLETED">
                <div className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
                  ${pendingChallengePayouts! > 0
                    ? "bg-neon-purple/5 border-neon-purple/30 hover:bg-neon-purple/10"
                    : "bg-bg-elevated border-bg-border hover:border-bg-border/80"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${pendingChallengePayouts! > 0 ? "bg-neon-purple/15" : "bg-bg-surface"}`}>
                    <Swords size={18} className={pendingChallengePayouts! > 0 ? "text-neon-purple" : "text-text-muted"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">Challenge Payouts</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {pendingChallengePayouts! > 0
                        ? `${pendingChallengePayouts} winner${pendingChallengePayouts !== 1 ? "s" : ""} awaiting payment`
                        : "No pending payouts"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black ${pendingChallengePayouts! > 0 ? "text-neon-purple" : "text-text-muted"}`}>
                      {pendingChallengePayouts}
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Visitor Stats */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Website Visitors</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="flex items-center gap-3">
              <Eye size={20} className="text-neon-blue" />
              <div>
                <p className="text-xs text-text-muted">Today</p>
                <p className="text-2xl font-bold">{visitorsToday.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3">
              <TrendingUp size={20} className="text-neon-purple" />
              <div>
                <p className="text-xs text-text-muted">Last 7 days</p>
                <p className="text-2xl font-bold">{visitorsThisWeek.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3">
              <Users size={20} className="text-neon-yellow" />
              <div>
                <p className="text-xs text-text-muted">Last 30 days</p>
                <p className="text-2xl font-bold">{visitorsThisMonth.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* 7-day bar chart (CSS-based) */}
        {recentDailyVisits.length > 0 && (() => {
          const max = Math.max(...recentDailyVisits.map((d) => d._count.id), 1);
          // Fill in missing days
          const days: { date: string; count: number }[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const found = recentDailyVisits.find((v) => v.date === d);
            days.push({ date: d, count: found ? found._count.id : 0 });
          }
          return (
            <Card>
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs text-text-muted mb-3">Daily unique visitors (last 7 days)</p>
                <div className="flex items-end gap-1.5 h-20">
                  {days.map(({ date, count }) => (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-text-muted tabular-nums">{count}</span>
                      <div
                        className="w-full rounded-t bg-neon-blue/60 hover:bg-neon-blue/80 transition-colors min-h-[2px]"
                        style={{ height: `${Math.max((count / max) * 56, 2)}px` }}
                        title={`${date}: ${count} visitors`}
                      />
                      <span className="text-[10px] text-text-muted">
                        {new Date(date + "T12:00:00Z").toLocaleDateString("en", { weekday: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })()}
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
