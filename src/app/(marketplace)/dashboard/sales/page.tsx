import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { TransactionStatusPill, ListingStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [transactions, listings] = await Promise.all([
    prisma.transaction.findMany({
      where: { sellerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: { screenshots: { where: { isCover: true }, take: 1 } },
        },
        buyer: { select: { username: true, displayName: true } },
      },
    }),
    prisma.listing.findMany({
      where: { sellerId: session.user.id, status: { in: ["ACTIVE", "PENDING_APPROVAL", "DRAFT"] } },
      orderBy: { createdAt: "desc" },
      include: { screenshots: { where: { isCover: true }, take: 1 } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Tag size={20} className="text-neon-green" /> My Sales
        </h1>
        <Link href="/listings/create">
          <Button size="sm">
            <Plus size={14} /> New Listing
          </Button>
        </Link>
      </div>

      {/* Active Listings */}
      {listings.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 text-text-muted">Active Listings</h2>
          <div className="flex flex-col gap-2">
            {listings.map((l) => (
              <Card key={l.id}>
                <CardContent className="flex items-center gap-4">
                  {l.screenshots[0] && (
                    <img
                      src={l.screenshots[0].url}
                      alt=""
                      className="w-20 h-14 object-cover rounded-lg border border-bg-border shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {l.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {l.platform} · {formatDate(l.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-neon-green">
                      {formatCurrency(l.price.toString())}
                    </span>
                    <ListingStatusPill status={l.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-text-muted">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Tag size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sales yet</p>
            <p className="text-sm mt-1">Create a listing to start selling</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <Link key={tx.id} href={`/dashboard/escrow/${tx.id}`}>
                <Card hover>
                  <CardContent className="flex items-center gap-4">
                    {tx.listing.screenshots[0] && (
                      <img
                        src={tx.listing.screenshots[0].url}
                        alt=""
                        className="w-20 h-14 object-cover rounded-lg border border-bg-border shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {tx.listing.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Buyer: {tx.buyer.displayName ?? tx.buyer.username} ·{" "}
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-bold text-neon-green">
                        {formatCurrency(tx.sellerReceives.toString())}
                      </span>
                      <TransactionStatusPill status={tx.status} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
