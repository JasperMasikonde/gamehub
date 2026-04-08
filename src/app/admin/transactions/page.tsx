import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
import { TransactionStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Banknote, Phone } from "lucide-react";

const STATUSES = ["ALL", "PENDING_PAYMENT", "IN_ESCROW", "DELIVERED", "COMPLETED", "DISPUTED", "REFUNDED", "CANCELLED"];

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const filterStatus = STATUSES.includes(statusParam ?? "") && statusParam !== "ALL" ? statusParam : undefined;

  const transactions = await prisma.transaction.findMany({
    where: filterStatus ? { status: filterStatus as "PENDING_PAYMENT" | "IN_ESCROW" | "DELIVERED" | "COMPLETED" | "DISPUTED" | "REFUNDED" | "CANCELLED" } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { username: true } },
      seller: { select: { username: true } },
    },
  });

  // Fetch the M-Pesa phone the seller used to pay into escrow (that's the number we send payout to)
  const txIds = transactions.map((tx) => tx.id);
  const escrowPayments = txIds.length > 0
    ? await prisma.payment.findMany({
        where: { purpose: "escrow", entityId: { in: txIds }, status: "COMPLETED" },
        select: { entityId: true, phone: true },
      })
    : [];
  const phoneByTxId = new Map(escrowPayments.map((p) => [p.entityId, p.phone]));

  const completedTotal = filterStatus === "COMPLETED"
    ? transactions.reduce((s, tx) => s + Number(tx.sellerReceives), 0)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Transactions</h1>
        <p className="text-sm text-text-muted">{transactions.length} {filterStatus ? filterStatus.toLowerCase().replace(/_/g, " ") : "total"}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active = (s === "ALL" && !filterStatus) || s === filterStatus;
          return (
            <Link
              key={s}
              href={s === "ALL" ? "/admin/transactions" : `/admin/transactions?status=${s}`}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                active
                  ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue"
                  : "bg-bg-elevated border-bg-border text-text-muted hover:text-text-primary"
              )}
            >
              {s === "ALL" ? "All" : s.replace(/_/g, " ")}
            </Link>
          );
        })}
      </div>

      {/* Payout summary banner */}
      {filterStatus === "COMPLETED" && completedTotal !== null && transactions.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-neon-green/5 border border-neon-green/30">
          <Banknote size={18} className="text-neon-green shrink-0" />
          <div>
            <p className="text-sm font-semibold text-neon-green">
              {transactions.length} seller{transactions.length !== 1 ? "s" : ""} awaiting payout
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Total to send: <span className="text-neon-green font-semibold">{formatCurrency(completedTotal.toString())}</span>
            </p>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                {["Listing", "Seller", "Payout Number", "Amount Paid", "To Send", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {transactions.map((tx) => {
                const payoutPhone = phoneByTxId.get(tx.id);
                return (
                  <tr
                    key={tx.id}
                    className={cn(
                      "hover:bg-bg-elevated/50 transition-colors",
                      tx.status === "COMPLETED" && "bg-neon-green/[0.03]"
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-text-primary max-w-[160px] truncate">
                        {tx.listing.title}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">{tx.buyer.username} (buyer)</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {tx.seller.username}
                    </td>
                    <td className="px-4 py-3">
                      {payoutPhone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-neon-green shrink-0" />
                          <span className="text-xs font-mono font-semibold text-neon-green">{payoutPhone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-text-primary">
                      {formatCurrency(tx.amount.toString())}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-neon-yellow">
                      {formatCurrency(tx.sellerReceives.toString())}
                    </td>
                    <td className="px-4 py-3">
                      <TransactionStatusPill status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p className="text-center text-sm text-text-muted py-8">No transactions</p>
          )}
        </div>
      </Card>
    </div>
  );
}
