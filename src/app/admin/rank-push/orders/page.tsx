import { redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ClipboardList } from "lucide-react";
import type { RankPushOrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Rank Push Orders | Admin | Eshabiki" };

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_COLORS: Record<string, "default" | "info" | "success" | "warning" | "danger" | "purple"> = {
  PENDING_PAYMENT: "warning",
  IN_PROGRESS: "info",
  DELIVERED: "purple",
  COMPLETED: "success",
  DISPUTED: "danger",
  CANCELLED: "default",
};

const ALL_STATUSES: RankPushOrderStatus[] = [
  "PENDING_PAYMENT",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "DISPUTED",
  "CANCELLED",
];

export default async function AdminRankPushOrdersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { status } = await searchParams;
  const filterStatus = ALL_STATUSES.find((s) => s === status);

  const orders = await prisma.rankPushOrder.findMany({
    where: filterStatus ? { status: filterStatus } : undefined,
    include: {
      listing: { select: { id: true, title: true } },
      client: { select: { id: true, username: true, displayName: true } },
      provider: { select: { id: true, username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-5xl flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <ClipboardList size={18} className="text-neon-purple" />
        <h1 className="text-xl font-bold">Rank Push Orders</h1>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/rank-push/orders"
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !filterStatus
              ? "bg-neon-purple/20 border-neon-purple/40 text-neon-purple"
              : "border-bg-border text-text-muted hover:text-text-primary"
          }`}
        >
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/rank-push/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterStatus === s
                ? "bg-neon-purple/20 border-neon-purple/40 text-neon-purple"
                : "border-bg-border text-text-muted hover:text-text-primary"
            }`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {filterStatus ? filterStatus.replace("_", " ") : "All"} Orders ({orders.length})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No orders found.</p>
          ) : (
            <div className="divide-y divide-bg-border">
              {orders.map((order) => (
                <div key={order.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{order.listing.title}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted mt-0.5">
                        <span>
                          Client:{" "}
                          <span className="text-text-primary">
                            {order.client.displayName ?? order.client.username}
                          </span>
                        </span>
                        <span>
                          Provider:{" "}
                          <span className="text-text-primary">
                            {order.provider.displayName ?? order.provider.username}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={STATUS_COLORS[order.status] ?? "default"}>
                        {order.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs font-semibold text-neon-green">
                        {formatCurrency(order.amount.toString(), order.currency)}
                      </span>
                      <span className="text-xs text-text-muted">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  {order.notes && (
                    <p className="text-xs text-text-subtle mt-1 bg-bg-elevated rounded px-2 py-1">
                      Client: {order.notes}
                    </p>
                  )}
                  {order.deliveryNote && (
                    <p className="text-xs text-text-subtle mt-1 bg-bg-elevated rounded px-2 py-1">
                      Provider: {order.deliveryNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
