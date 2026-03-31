import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EscrowTimeline } from "@/components/escrow/EscrowTimeline";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TransactionStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { SellerDeliveryForm } from "@/components/escrow/SellerDeliveryForm";
import { BuyerActionPanel } from "@/components/escrow/BuyerActionPanel";
import { CredentialsReveal } from "@/components/escrow/CredentialsReveal";
import { ReviewForm } from "@/components/escrow/ReviewForm";
import { SimulatePaymentPanel } from "@/components/escrow/SimulatePaymentPanel";
import { RealtimeRefresh } from "@/components/escrow/RealtimeRefresh";
import { ShieldCheck, MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function EscrowDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      listing: {
        include: { screenshots: { orderBy: { order: "asc" } } },
      },
      buyer: { select: { id: true, username: true, displayName: true } },
      seller: { select: { id: true, username: true, displayName: true } },
      dispute: true,
      review: true,
    },
  });

  if (!transaction) notFound();

  const isBuyer = transaction.buyerId === session.user.id;
  const isSeller = transaction.sellerId === session.user.id;
  if (!isBuyer && !isSeller) redirect("/dashboard");

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      <RealtimeRefresh events={["transaction_update"]} />

      <div>
        <h1 className="text-xl font-bold mb-1">Escrow Transaction</h1>
        <p className="text-xs text-text-muted">ID: {transaction.id}</p>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent>
          <EscrowTimeline status={transaction.status} />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Transaction Details</h2>
            <TransactionStatusPill status={transaction.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            {transaction.listing.screenshots[0] && (
              <img
                src={transaction.listing.screenshots[0].url}
                alt=""
                className="w-20 h-14 object-cover rounded-lg border border-bg-border shrink-0"
              />
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {transaction.listing.title}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {isBuyer ? (
                  <>Seller: {transaction.seller.displayName ?? transaction.seller.username}</>
                ) : (
                  <>Buyer: {transaction.buyer.displayName ?? transaction.buyer.username}</>
                )}
              </p>
            </div>
          </div>

          {/* All delivery screenshots */}
          {transaction.listing.screenshots.length > 1 && (
            <div className="mb-4">
              <p className="text-xs text-text-muted mb-2">Account screenshots (at time of delivery)</p>
              <div className="grid grid-cols-3 gap-2">
                {transaction.listing.screenshots.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={s.url}
                      alt=""
                      className="w-full aspect-video object-cover rounded-lg border border-bg-border hover:border-neon-blue/40 transition-colors"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Amount</p>
              <p className="font-semibold text-text-primary">
                {formatCurrency(transaction.amount.toString())}
              </p>
            </div>
            {isSeller && (
              <div>
                <p className="text-xs text-text-muted">You receive</p>
                <p className="font-semibold text-neon-green">
                  {formatCurrency(transaction.sellerReceives.toString())}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted">Date</p>
              <p className="font-medium">{formatDate(transaction.createdAt)}</p>
            </div>
            {transaction.deliveryDeadline && (
              <div>
                <p className="text-xs text-text-muted">Delivery deadline</p>
                <p className="font-medium">
                  {formatDate(transaction.deliveryDeadline)}
                </p>
              </div>
            )}
            {transaction.confirmationDeadline && (
              <div>
                <p className="text-xs text-text-muted">Confirm by</p>
                <p className="font-medium">
                  {formatDate(transaction.confirmationDeadline)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buyer: simulate payment */}
      {isBuyer && transaction.status === "PENDING_PAYMENT" && (
        <SimulatePaymentPanel
          transactionId={transaction.id}
          amount={transaction.amount.toString()}
          currency={transaction.currency}
        />
      )}

      {/* Seller: waiting for payment */}
      {isSeller && transaction.status === "PENDING_PAYMENT" && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 py-2">
              <ShieldCheck size={18} className="text-neon-yellow shrink-0" />
              <div>
                <p className="text-sm font-semibold">Waiting for buyer payment</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Once the buyer completes payment, funds enter escrow and you&apos;ll be
                  prompted to deliver the account credentials.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seller: deliver credentials */}
      {isSeller && transaction.status === "IN_ESCROW" && (
        <SellerDeliveryForm transactionId={transaction.id} listingId={transaction.listingId} />
      )}

      {/* Buyer: see credentials */}
      {isBuyer &&
        ["DELIVERED", "COMPLETED", "DISPUTED"].includes(transaction.status) && (
          <CredentialsReveal transactionId={transaction.id} />
        )}

      {/* Buyer: confirm or dispute */}
      {isBuyer && transaction.status === "DELIVERED" && (
        <BuyerActionPanel transactionId={transaction.id} />
      )}

      {/* Dispute info */}
      {transaction.dispute && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-neon-red">
                Dispute Information
              </h2>
              {admin && (
                <Link
                  href={`/messages/${admin.id}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-neon-blue hover:text-neon-blue/80 transition-colors"
                >
                  <MessageSquare size={13} />
                  Chat with Admin
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-subtle">{transaction.dispute.reason}</p>
            <p className="text-xs text-text-muted mt-1">
              Status: {transaction.dispute.status}
            </p>
            {transaction.dispute.resolution && (
              <div className="mt-2 bg-bg-elevated rounded-lg p-3 text-xs text-text-subtle">
                <p className="font-medium text-text-primary mb-1">
                  Admin resolution:
                </p>
                {transaction.dispute.resolution}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Buyer review for completed transactions */}
      {isBuyer && transaction.status === "COMPLETED" && !transaction.review && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm">Leave a Review</h2>
          </CardHeader>
          <CardContent>
            <ReviewForm transactionId={transaction.id} />
          </CardContent>
        </Card>
      )}

      {transaction.review && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm text-neon-yellow">Your Review</h2>
          </CardHeader>
          <CardContent>
            <div className="flex gap-0.5 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-lg leading-none ${i < transaction.review!.rating ? "text-neon-yellow" : "text-bg-border"}`}
                >
                  ★
                </span>
              ))}
            </div>
            {transaction.review.comment && (
              <p className="text-xs text-text-subtle">{transaction.review.comment}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-1.5 text-xs text-text-muted justify-center">
        <ShieldCheck size={12} className="text-neon-green" />
        Protected by GameHub Escrow
      </div>
    </div>
  );
}
