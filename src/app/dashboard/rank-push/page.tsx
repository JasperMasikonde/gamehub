import { redirect } from "next/navigation";
import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RankPushOrderActions } from "@/components/rank-push/RankPushOrderActions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "My Rank Push | Eshabiki" };

const STATUS_COLORS: Record<string, "default" | "info" | "success" | "warning" | "danger" | "purple"> = {
  PENDING_PAYMENT: "warning",
  IN_PROGRESS: "info",
  DELIVERED: "purple",
  COMPLETED: "success",
  DISPUTED: "danger",
  CANCELLED: "default",
};

export default async function DashboardRankPushPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isRankPusher: true },
  });

  const [clientOrders, providerOrders] = await Promise.all([
    prisma.rankPushOrder.findMany({
      where: { clientId: userId },
      include: {
        listing: { select: { id: true, title: true } },
        provider: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    dbUser?.isRankPusher
      ? prisma.rankPushOrder.findMany({
          where: { providerId: userId },
          include: {
            listing: { select: { id: true, title: true } },
            client: { select: { id: true, username: true, displayName: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-neon-purple" />
        <h1 className="text-xl font-bold">Rank Push</h1>
      </div>

      {/* My Orders as Client */}
      <section>
        <h2 className="text-base font-semibold mb-3">My Orders</h2>
        {clientOrders.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-text-muted text-center py-4">
                No orders yet.{" "}
                <a href="/rank-push" className="text-neon-purple underline underline-offset-2">
                  Browse services →
                </a>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {clientOrders.map((order) => (
              <Card key={order.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {order.listing.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Provider:{" "}
                        {order.provider.displayName ?? order.provider.username}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={STATUS_COLORS[order.status] ?? "default"}>
                          {order.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-neon-green font-semibold">
                          {formatCurrency(order.amount.toString(), order.currency)}
                        </span>
                      </div>
                      {order.deliveryNote && order.status === "DELIVERED" && (
                        <p className="text-xs text-text-subtle mt-2 bg-bg-elevated rounded-lg px-3 py-2">
                          Provider note: {order.deliveryNote}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-text-muted whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </p>
                      <RankPushOrderActions
                        orderId={order.id}
                        status={order.status}
                        role="client"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* My Services as Provider */}
      {dbUser?.isRankPusher && (
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-semibold">My Services — Orders to Fulfill</h2>
            <a
              href="/rank-push/create"
              className="text-xs text-neon-purple underline underline-offset-2"
            >
              + Create listing
            </a>
          </div>
          {providerOrders.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-sm text-text-muted text-center py-4">
                  No orders to fulfill yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {providerOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {order.listing.title}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          Client: {order.client.displayName ?? order.client.username}
                        </p>
                        {order.notes && (
                          <p className="text-xs text-text-subtle mt-1 bg-bg-elevated rounded-lg px-3 py-2">
                            Client note: {order.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={STATUS_COLORS[order.status] ?? "default"}>
                            {order.status.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-neon-green font-semibold">
                            {formatCurrency(order.providerGets.toString(), order.currency)}{" "}
                            <span className="text-text-muted font-normal">(your cut)</span>
                          </span>
                        </div>
                        {order.squadUrl && (
                          <a
                            href={order.squadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-neon-blue underline underline-offset-2 mt-1 inline-block"
                          >
                            View squad screenshot →
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-xs text-text-muted whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </p>
                        <RankPushOrderActions
                          orderId={order.id}
                          status={order.status}
                          role="provider"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
