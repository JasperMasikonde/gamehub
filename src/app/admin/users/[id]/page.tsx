import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TransactionStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { ShieldCheck } from "lucide-react";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      listings: { orderBy: { createdAt: "desc" }, take: 10 },
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { listing: { select: { title: true } } },
      },
      sales: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { listing: { select: { title: true } } },
      },
    },
  });

  if (!user) notFound();

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{user.username}</h1>
            {user.isVerifiedSeller && (
              <ShieldCheck size={16} className="text-neon-blue" />
            )}
          </div>
          <p className="text-sm text-text-muted">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={user.role === "ADMIN" ? "danger" : "default"}>
              {user.role}
            </Badge>
            <Badge
              variant={
                user.status === "ACTIVE"
                  ? "success"
                  : user.status === "BANNED"
                  ? "danger"
                  : "warning"
              }
            >
              {user.status}
            </Badge>
          </div>
        </div>
        {user.role !== "ADMIN" && (
          <AdminUserActions
            userId={user.id}
            status={user.status}
            isVerifiedSeller={user.isVerifiedSeller}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card>
          <CardContent>
            <p className="text-2xl font-bold text-neon-green">{user.totalSales}</p>
            <p className="text-xs text-text-muted">Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-2xl font-bold text-neon-blue">{user.totalPurchases}</p>
            <p className="text-xs text-text-muted">Purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-2xl font-bold">
              {user.rating ? user.rating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-text-muted">Rating</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-bg-border">
            {[...user.purchases, ...user.sales]
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 10)
              .map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <p className="text-xs text-text-primary truncate max-w-[50%]">
                    {tx.listing.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neon-green">
                      {formatCurrency(tx.amount.toString())}
                    </span>
                    <TransactionStatusPill status={tx.status} />
                  </div>
                </div>
              ))}
            {user.purchases.length === 0 && user.sales.length === 0 && (
              <p className="text-center text-sm text-text-muted py-4">
                No transactions
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-text-muted text-center">
        Member since {formatDate(user.createdAt)}
      </p>
    </div>
  );
}
