import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { BuyButton } from "@/components/listings/BuyButton";
import { ShieldCheck, Star, Gamepad2, Coins, Trophy, Users, Eye } from "lucide-react";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
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
        screenshots: { orderBy: { order: "asc" } },
      },
    }),
    auth(),
  ]);

  // Increment view count (fire and forget)
  if (listing) {
    void prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
  }

  if (!listing || listing.status !== "ACTIVE") notFound();

  const isSeller = session?.user?.id === listing.sellerId;

  const sellerReviews = await prisma.review.findMany({
    where: { revieweeId: listing.sellerId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      reviewer: { select: { username: true, displayName: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 grid lg:grid-cols-3 gap-6">
      {/* Left: images + details */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Image gallery */}
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
          {listing.screenshots.length > 0 ? (
            <div>
              <img
                src={listing.screenshots[0].url}
                alt={listing.title}
                className="w-full h-auto max-h-[70vh] object-contain bg-bg-elevated"
              />
              {listing.screenshots.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {listing.screenshots.slice(1).map((s) => (
                    <img
                      key={s.id}
                      src={s.url}
                      alt=""
                      className="h-16 w-28 object-cover rounded-lg border border-bg-border shrink-0"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center text-text-muted">
              <Gamepad2 size={64} className="opacity-20" />
            </div>
          )}
        </div>

        {/* Title + description */}
        <Card>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="info">{listing.platform}</Badge>
              {listing.region && <Badge variant="default">{listing.region}</Badge>}
              {listing.division && <Badge variant="purple">{listing.division}</Badge>}
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-3">
              {listing.title}
            </h1>
            <p className="text-sm text-text-subtle leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </CardContent>
        </Card>

        {/* Account stats */}
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold text-text-primary mb-3">
              Account Details
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {listing.accountLevel && (
                <div className="flex items-center gap-2 bg-bg-elevated rounded-lg p-3">
                  <Trophy size={16} className="text-neon-yellow" />
                  <div>
                    <p className="text-xs text-text-muted">Level</p>
                    <p className="text-sm font-semibold">{listing.accountLevel}</p>
                  </div>
                </div>
              )}
              {listing.overallRating && (
                <div className="flex items-center gap-2 bg-bg-elevated rounded-lg p-3">
                  <Star size={16} className="text-neon-green" />
                  <div>
                    <p className="text-xs text-text-muted">OVR</p>
                    <p className="text-sm font-semibold">{listing.overallRating}</p>
                  </div>
                </div>
              )}
              {listing.coins && (
                <div className="flex items-center gap-2 bg-bg-elevated rounded-lg p-3">
                  <Coins size={16} className="text-neon-yellow" />
                  <div>
                    <p className="text-xs text-text-muted">Coins</p>
                    <p className="text-sm font-semibold">
                      {listing.coins.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {listing.gpAmount && (
                <div className="flex items-center gap-2 bg-bg-elevated rounded-lg p-3">
                  <Coins size={16} className="text-neon-blue" />
                  <div>
                    <p className="text-xs text-text-muted">GP</p>
                    <p className="text-sm font-semibold">
                      {listing.gpAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {listing.featuredPlayers.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-text-muted mb-1.5 flex items-center gap-1">
                  <Users size={12} /> Featured Players
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {listing.featuredPlayers.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 bg-bg-elevated border border-bg-border rounded text-xs text-text-subtle"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seller reviews */}
      {sellerReviews.length > 0 && (
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
              <Star size={14} className="text-neon-yellow" />
              Seller Reviews
              <span className="text-text-muted font-normal">({sellerReviews.length})</span>
            </h2>
            <div className="flex flex-col gap-3">
              {sellerReviews.map((r) => (
                <div key={r.id} className="border-b border-bg-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-primary">
                      {r.reviewer.displayName ?? r.reviewer.username}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-sm leading-none ${i < r.rating ? "text-neon-yellow" : "text-bg-border"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-xs text-text-subtle">{r.comment}</p>
                  )}
                  <p className="text-xs text-text-muted/60 mt-1">{formatDate(r.createdAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Right: price + buy */}
      <div className="flex flex-col gap-4">
        <Card className="sticky top-20">
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-neon-green text-glow-green">
                {formatCurrency(listing.price.toString())}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Price includes escrow protection
              </p>
            </div>

            {!isSeller && <BuyButton listingId={listing.id} />}
            {isSeller && (
              <div className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-center text-sm text-text-muted">
                This is your listing
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-neon-green" />
                Escrow-protected transaction
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-neon-green" />
                Credentials delivered securely
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-neon-green" />
                Admin dispute resolution
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller card */}
        <Card>
          <CardContent>
            <h3 className="text-xs font-semibold text-text-muted mb-3">SELLER</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
                {listing.seller.avatarUrl ? (
                  <img
                    src={listing.seller.avatarUrl}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-text-muted">
                    {listing.seller.username[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {listing.seller.displayName ?? listing.seller.username}
                  </p>
                  {listing.seller.isVerifiedSeller && (
                    <ShieldCheck size={13} className="text-neon-blue" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  {listing.seller.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-neon-yellow fill-neon-yellow" />
                      {listing.seller.rating.toFixed(1)}
                    </span>
                  )}
                  <span>{listing.seller.totalSales} sales</span>
                </div>
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
