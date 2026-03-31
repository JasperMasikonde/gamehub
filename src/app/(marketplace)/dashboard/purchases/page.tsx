import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { TransactionStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export default async function PurchasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const purchases = await prisma.transaction.findMany({
    where: { buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { screenshots: { where: { isCover: true }, take: 1 } },
      },
      seller: { select: { username: true, displayName: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ShoppingCart size={20} className="text-neon-blue" /> My Purchases
      </h1>

      {purchases.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No purchases yet</p>
          <Link
            href="/listings"
            className="text-sm text-neon-blue hover:underline mt-1 inline-block"
          >
            Browse accounts
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {purchases.map((tx) => (
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
                      Seller: {tx.seller.displayName ?? tx.seller.username} ·{" "}
                      {formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-text-primary">
                      {formatCurrency(tx.amount.toString())}
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
  );
}
