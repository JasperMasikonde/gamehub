import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrderPanel } from "@/components/rank-push/OrderPanel";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ShieldCheck, Star, TrendingUp } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.rankPushListing.findUnique({
    where: { id },
    select: { title: true },
  });
  return {
    title: listing ? `${listing.title} | Rank Push | Eshabiki` : "Rank Push | Eshabiki",
  };
}

export default async function RankPushDetailPage({ params }: Props) {
  const { id } = await params;
  const [listing, session] = await Promise.all([
    prisma.rankPushListing.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerifiedSeller: true,
            rating: true,
            totalSales: true,
            createdAt: true,
          },
        },
        category: { select: { id: true, name: true } },
        _count: { select: { orders: { where: { status: "COMPLETED" } } } },
      },
    }),
    auth(),
  ]);

  if (!listing || !listing.isActive) notFound();

  const isProvider = session?.user?.id === listing.providerId;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 grid lg:grid-cols-3 gap-6">
      {/* Left: listing info */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="purple">{listing.category.name}</Badge>
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-3">{listing.title}</h1>
            {listing.description && (
              <p className="text-sm text-text-subtle leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Provider card */}
        <Card>
          <CardContent>
            <h2 className="text-xs font-semibold text-text-muted mb-3">PROVIDER</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
                {listing.provider.avatarUrl ? (
                  <img
                    src={listing.provider.avatarUrl}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-base font-bold text-text-muted">
                    {listing.provider.username[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-text-primary">
                    {listing.provider.displayName ?? listing.provider.username}
                  </p>
                  {listing.provider.isVerifiedSeller && (
                    <ShieldCheck size={13} className="text-neon-blue" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                  {listing.provider.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-neon-yellow fill-neon-yellow" />
                      {listing.provider.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <TrendingUp size={10} />
                    {listing._count.orders} completed
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: order panel */}
      <div className="flex flex-col gap-4">
        <Card className="sticky top-20">
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-neon-green text-glow-green">
                {formatCurrency(listing.price.toString(), listing.currency)}
              </p>
              <p className="text-xs text-text-muted mt-1">M-Pesa escrow protected</p>
            </div>

            {isProvider ? (
              <div className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-center text-sm text-text-muted">
                This is your listing
              </div>
            ) : (
              <OrderPanel
                listingId={listing.id}
                price={Number(listing.price)}
                currency={listing.currency}
                isLoggedIn={!!session?.user}
              />
            )}

            <div className="mt-4 flex flex-col gap-2 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-neon-green" />
                Payment held in escrow until you confirm
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-neon-green" />
                Dispute resolution by admins
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-text-muted text-center">
          Listed {formatDate(listing.createdAt)}
        </p>
      </div>
    </div>
  );
}
