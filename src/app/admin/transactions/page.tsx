import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
import { TransactionStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";

export default async function AdminTransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { username: true } },
      seller: { select: { username: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Transactions</h1>
        <p className="text-sm text-text-muted">{transactions.length} total</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                {["Listing", "Buyer", "Seller", "Amount", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-bg-elevated/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-text-primary max-w-[180px] truncate">
                      {tx.listing.title}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {tx.buyer.username}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {tx.seller.username}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neon-green">
                    {formatCurrency(tx.amount.toString())}
                  </td>
                  <td className="px-4 py-3">
                    <TransactionStatusPill status={tx.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatDate(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p className="text-center text-sm text-text-muted py-8">
              No transactions yet
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
