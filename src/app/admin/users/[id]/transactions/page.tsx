import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { formatChallengeFormat } from "@/lib/utils/format";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Minus } from "lucide-react";

const PAGE_SIZE = 50;

const WALLET_TX_LABELS: Record<string, string> = {
  DEPOSIT:           "Deposit",
  CHALLENGE_WIN:     "Challenge Win",
  CHALLENGE_WAGER:   "Challenge Wager",
  PAYOUT:            "Payout",
  ADMIN_ADJUSTMENT:  "Admin Adjustment",
  SALE_CREDIT:       "Sale Credit",
  REFUND_CREDIT:     "Refund",
  RANK_PUSH_CREDIT:  "Rank Push Credit",
  TOURNAMENT_WIN:    "Tournament Win",
};

const CREDIT_WALLET_TYPES = new Set([
  "DEPOSIT", "CHALLENGE_WIN", "SALE_CREDIT", "REFUND_CREDIT",
  "RANK_PUSH_CREDIT", "TOURNAMENT_WIN",
]);

function isWalletCredit(type: string, description: string): boolean {
  if (CREDIT_WALLET_TYPES.has(type)) return true;
  if (type === "ADMIN_ADJUSTMENT") return description.toLowerCase().includes("admin credit");
  return false;
}

type Entry = {
  key: string;
  date: Date;
  category: string;
  categoryVariant: "default" | "success" | "warning" | "danger" | "info" | "purple";
  description: string;
  detail?: string;
  amount: number;
  direction: "credit" | "debit" | "neutral";
  status: string;
  statusVariant: "default" | "success" | "warning" | "danger" | "info" | "purple";
  link?: string;
};

function fmt(d: Date) {
  return d.toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function statusVariant(s: string): Entry["statusVariant"] {
  const v: Record<string, Entry["statusVariant"]> = {
    COMPLETED: "success", ACTIVE: "info", OPEN: "info", PAID: "success",
    DELIVERED: "purple", IN_ESCROW: "info", PENDING: "warning",
    PENDING_PAYMENT: "warning", PROCESSING: "warning", APPROVED: "success",
    DISPUTED: "danger", CANCELLED: "default", FAILED: "danger",
    REFUNDED: "warning", REJECTED: "danger", SUBMITTED: "purple",
    PENDING_HOST_PAYMENT: "warning", SHIPPED: "info",
  };
  return v[s] ?? "default";
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default async function UserTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1"));

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, displayName: true, email: true },
  });
  if (!user) notFound();

  const [
    walletTxs,
    purchases,
    sales,
    hostChallenges,
    challengerChallenges,
    shopOrders,
    payouts,
    rankPushOrders,
    tournamentEntries,
  ] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { buyerId: id },
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { id: true, title: true } } },
    }),
    prisma.transaction.findMany({
      where: { sellerId: id },
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { id: true, title: true } } },
    }),
    prisma.challenge.findMany({
      where: { hostId: id },
      orderBy: { createdAt: "desc" },
      include: { challenger: { select: { username: true } } },
    }),
    prisma.challenge.findMany({
      where: { challengerId: id },
      orderBy: { createdAt: "desc" },
      include: { host: { select: { username: true } } },
    }),
    prisma.shopOrder.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      include: { items: { select: { productName: true, quantity: true } } },
    }),
    prisma.payoutRequest.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rankPushOrder.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { title: true } } },
    }),
    prisma.tournamentParticipant.findMany({
      where: { userId: id },
      orderBy: { joinedAt: "desc" },
      include: { tournament: { select: { id: true, name: true, entryFee: true, requiresPayment: true } } },
    }),
  ]);

  const entries: Entry[] = [];

  for (const t of walletTxs) {
    const credit = isWalletCredit(t.type, t.description);
    entries.push({
      key: `wallet-${t.id}`,
      date: t.createdAt,
      category: WALLET_TX_LABELS[t.type] ?? t.type,
      categoryVariant: credit ? "success" : "danger",
      description: t.description,
      detail: `Balance after: KES ${Number(t.balanceAfter).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
      amount: Number(t.amount),
      direction: credit ? "credit" : "debit",
      status: "—",
      statusVariant: "default",
    });
  }

  for (const t of purchases) {
    entries.push({
      key: `buy-${t.id}`,
      date: t.createdAt,
      category: "Purchase",
      categoryVariant: "warning",
      description: t.listing.title,
      amount: Number(t.amount),
      direction: "debit",
      status: formatStatus(t.status),
      statusVariant: statusVariant(t.status),
      link: `/admin/transactions`,
    });
  }

  for (const t of sales) {
    entries.push({
      key: `sell-${t.id}`,
      date: t.createdAt,
      category: "Sale",
      categoryVariant: "info",
      description: t.listing.title,
      amount: Number(t.sellerReceives),
      direction: t.status === "COMPLETED" ? "credit" : "neutral",
      status: formatStatus(t.status),
      statusVariant: statusVariant(t.status),
      link: `/admin/transactions`,
    });
  }

  for (const c of hostChallenges) {
    const opponent = c.challenger?.username ?? "—";
    entries.push({
      key: `challenge-host-${c.id}`,
      date: c.createdAt,
      category: "Challenge (Host)",
      categoryVariant: "purple",
      description: `${formatChallengeFormat(c.format)} vs ${opponent}`,
      amount: Number(c.wagerAmount),
      direction: "neutral",
      status: formatStatus(c.status),
      statusVariant: statusVariant(c.status),
      link: `/admin/challenges/${c.id}`,
    });
  }

  for (const c of challengerChallenges) {
    entries.push({
      key: `challenge-challenger-${c.id}`,
      date: c.createdAt,
      category: "Challenge",
      categoryVariant: "purple",
      description: `${formatChallengeFormat(c.format)} vs ${c.host.username}`,
      amount: Number(c.wagerAmount),
      direction: "neutral",
      status: formatStatus(c.status),
      statusVariant: statusVariant(c.status),
      link: `/admin/challenges/${c.id}`,
    });
  }

  for (const o of shopOrders) {
    const itemSummary = o.items.map(i => `${i.productName}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ");
    entries.push({
      key: `shop-${o.id}`,
      date: o.createdAt,
      category: "Shop Order",
      categoryVariant: "info",
      description: itemSummary || `Order #${o.id.slice(-6).toUpperCase()}`,
      amount: Number(o.total),
      direction: "debit",
      status: formatStatus(o.status),
      statusVariant: statusVariant(o.status),
      link: `/admin/shop/orders/${o.id}`,
    });
  }

  for (const p of payouts) {
    entries.push({
      key: `payout-${p.id}`,
      date: p.createdAt,
      category: "Payout",
      categoryVariant: "warning",
      description: `Withdrawal to ${p.phone}`,
      amount: Number(p.amount),
      direction: "debit",
      status: formatStatus(p.status),
      statusVariant: statusVariant(p.status),
      link: `/admin/payouts`,
    });
  }

  for (const o of rankPushOrders) {
    entries.push({
      key: `rankpush-${o.id}`,
      date: o.createdAt,
      category: "Rank Push",
      categoryVariant: "info",
      description: o.listing.title,
      amount: Number(o.amount),
      direction: "debit",
      status: formatStatus(o.status),
      statusVariant: statusVariant(o.status),
      link: `/admin/rank-push/orders`,
    });
  }

  for (const p of tournamentEntries) {
    entries.push({
      key: `tournament-${p.tournamentId}`,
      date: p.joinedAt,
      category: "Tournament",
      categoryVariant: "purple",
      description: p.tournament.name,
      amount: p.tournament.requiresPayment ? Number(p.tournament.entryFee) : 0,
      direction: p.tournament.requiresPayment ? "debit" : "neutral",
      status: "Joined",
      statusVariant: "success",
      link: `/admin/tournaments/${p.tournamentId}`,
    });
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const total = entries.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const displayName = user.displayName ?? user.username;

  return (
    <div className="max-w-4xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/users/${id}`}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={13} />
          Back to user
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">All Transactions</h1>
          <p className="text-sm text-text-muted mt-0.5">
            @{user.username} · {total} record{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">No transactions found for this user.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-elevated">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((e) => (
                  <tr key={e.key} className="hover:bg-bg-elevated/50 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap font-mono">
                      {fmt(e.date)}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={e.categoryVariant}>{e.category}</Badge>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-xs text-text-primary truncate">{e.description}</p>
                      {e.detail && (
                        <p className="text-[11px] text-text-muted mt-0.5 truncate">{e.detail}</p>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={
                        e.direction === "credit" ? "text-neon-green font-semibold flex items-center justify-end gap-0.5"
                        : e.direction === "debit"  ? "text-neon-red font-semibold flex items-center justify-end gap-0.5"
                        : "text-text-primary font-medium flex items-center justify-end gap-0.5"
                      }>
                        {e.direction === "credit" && <ArrowUpRight size={12} />}
                        {e.direction === "debit"  && <ArrowDownLeft size={12} />}
                        {e.direction === "neutral" && <Minus size={10} className="text-text-muted" />}
                        {e.amount > 0
                          ? `KES ${e.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                          : "—"
                        }
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {e.status !== "—" ? (
                        <Badge variant={e.statusVariant}>{e.status}</Badge>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>

                    {/* Link */}
                    <td className="px-4 py-3">
                      {e.link && (
                        <Link
                          href={e.link}
                          className="text-xs text-text-muted hover:text-neon-blue transition-colors"
                          title="View details"
                        >
                          <ArrowUpRight size={13} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/users/${id}/transactions?page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-border hover:border-text-muted transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users/${id}/transactions?page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-border hover:border-text-muted transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
