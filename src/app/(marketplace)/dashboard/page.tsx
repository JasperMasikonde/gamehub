import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { TransactionStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import {
  ShoppingCart, Tag, Bell, TrendingUp, ArrowRight,
  Plus, AlertTriangle, ChevronRight, MailWarning,
} from "lucide-react";
import { VerificationBanner } from "@/components/dashboard/VerificationBanner";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { verified } = await searchParams;

  const [purchases, sales, unread, activeListings, openDisputes, user] = await Promise.all([
    prisma.transaction.findMany({
      where: { buyerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { listing: { select: { title: true } } },
    }),
    prisma.transaction.findMany({
      where: { sellerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { listing: { select: { title: true } } },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
    prisma.listing.count({
      where: { sellerId: session.user.id, status: "ACTIVE" },
    }),
    prisma.dispute.count({
      where: { raisedById: session.user.id, status: { in: ["OPEN", "UNDER_REVIEW"] } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totalSales: true, totalPurchases: true, rating: true, displayName: true, username: true, emailVerified: true, isSuperAdmin: true },
    }),
  ]);

  const stats = [
    { icon: Tag, label: "Total Sales", value: user?.totalSales ?? 0, color: "text-neon-green", border: "border-neon-green/20", bg: "bg-neon-green/5", href: "/dashboard/sales" },
    { icon: ShoppingCart, label: "Purchases", value: user?.totalPurchases ?? 0, color: "text-neon-blue", border: "border-neon-blue/20", bg: "bg-neon-blue/5", href: "/dashboard/purchases" },
    { icon: TrendingUp, label: "Active Listings", value: activeListings, color: "text-neon-purple", border: "border-neon-purple/20", bg: "bg-neon-purple/5", href: "/dashboard/sales" },
    { icon: Bell, label: "Unread Alerts", value: unread, color: "text-neon-yellow", border: "border-neon-yellow/20", bg: "bg-neon-yellow/5", href: "/dashboard" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="text-neon-green">{user?.displayName ?? user?.username}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your listings, purchases, and transactions
          </p>
        </div>
        <Link href="/listings/create">
          <Button size="sm">
            <Plus size={14} /> New Listing
          </Button>
        </Link>
      </div>

      {/* Email verification banner */}
      {!user?.emailVerified && !user?.isSuperAdmin && (
        <VerificationBanner justVerified={false} />
      )}
      {verified === "1" && (
        <div className="flex items-center gap-3 bg-neon-green/5 border border-neon-green/30 rounded-xl px-4 py-3">
          <MailWarning size={16} className="text-neon-green shrink-0" />
          <p className="text-sm text-neon-green font-medium">
            Your email has been verified. You now have full access to Eshabiki.
          </p>
        </div>
      )}
      {verified === "invalid" && (
        <div className="flex items-center gap-3 bg-neon-red/5 border border-neon-red/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-neon-red shrink-0" />
          <p className="text-sm text-neon-red font-medium">
            Verification link is invalid or expired. Please request a new one below.
          </p>
        </div>
      )}

      {/* Alert banner for open disputes */}
      {openDisputes > 0 && (
        <Link href="/dashboard/disputes">
          <div className="flex items-center gap-3 bg-neon-red/5 border border-neon-red/30 rounded-xl px-4 py-3 hover:bg-neon-red/10 transition-colors">
            <AlertTriangle size={16} className="text-neon-red shrink-0" />
            <p className="text-sm text-neon-red font-medium flex-1">
              You have {openDisputes} open {openDisputes === 1 ? "dispute" : "disputes"} awaiting resolution
            </p>
            <ArrowRight size={14} className="text-neon-red" />
          </div>
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className={`rounded-xl border ${stat.border} ${stat.bg} p-4 hover:brightness-110 transition-all cursor-pointer`}>
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={18} className={stat.color} />
                <ChevronRight size={13} className="text-text-muted opacity-50" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <ShoppingCart size={14} className="text-neon-blue" /> Recent Purchases
            </h2>
            <Link href="/dashboard/purchases" className="text-xs text-neon-blue hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-text-muted border border-dashed border-bg-border rounded-xl">
                <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No purchases yet</p>
                <Link href="/listings" className="text-xs text-neon-blue hover:underline mt-1 inline-block">
                  Browse accounts
                </Link>
              </div>
            ) : (
              purchases.map((tx) => (
                <Link key={tx.id} href={`/dashboard/escrow/${tx.id}`}>
                  <Card hover>
                    <CardContent className="flex items-center justify-between py-3">
                      <p className="text-xs text-text-primary truncate max-w-[60%]">
                        {tx.listing.title}
                      </p>
                      <TransactionStatusPill status={tx.status} />
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Tag size={14} className="text-neon-green" /> Recent Sales
            </h2>
            <Link href="/dashboard/sales" className="text-xs text-neon-blue hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {sales.length === 0 ? (
              <div className="text-center py-8 text-text-muted border border-dashed border-bg-border rounded-xl">
                <Tag size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sales yet</p>
                <Link href="/listings/create" className="text-xs text-neon-blue hover:underline mt-1 inline-block">
                  Create a listing
                </Link>
              </div>
            ) : (
              sales.map((tx) => (
                <Link key={tx.id} href={`/dashboard/escrow/${tx.id}`}>
                  <Card hover>
                    <CardContent className="flex items-center justify-between py-3">
                      <p className="text-xs text-text-primary truncate max-w-[50%]">
                        {tx.listing.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neon-green">
                          {formatCurrency(tx.sellerReceives.toString())}
                        </span>
                        <TransactionStatusPill status={tx.status} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
