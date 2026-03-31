import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listings/ListingCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";
import { ShieldCheck, Star, Package } from "lucide-react";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      listings: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          screenshots: { where: { isCover: true }, take: 1 },
        },
      },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          reviewer: { select: { username: true, displayName: true } },
        },
      },
    },
  });

  if (!user) notFound();

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Profile header */}
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0 text-2xl font-bold text-text-muted">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-full h-full rounded-2xl object-cover"
            />
          ) : (
            user.username[0].toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">
              {user.displayName ?? user.username}
            </h1>
            {user.isVerifiedSeller && (
              <span className="flex items-center gap-1 text-xs text-neon-blue">
                <ShieldCheck size={13} /> Verified Seller
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-text-subtle mt-2">{user.bio}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-text-muted">
              <Package size={13} /> {user.totalSales} sales
            </span>
            {user.rating && (
              <span className="flex items-center gap-1 text-text-muted">
                <Star size={13} className="text-neon-yellow fill-neon-yellow" />
                {user.rating.toFixed(1)} rating
              </span>
            )}
            <span className="text-text-muted text-xs">
              Member since {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Active listings */}
      {user.listings.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Active Listings ({user.listings.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{
                  ...listing,
                  seller: {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    isVerifiedSeller: user.isVerifiedSeller,
                    rating: user.rating,
                    role: user.role,
                  },
                  screenshots: listing.screenshots,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {user.reviewsReceived.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Reviews</h2>
          <div className="flex flex-col gap-3">
            {user.reviewsReceived.map((r) => (
              <div
                key={r.id}
                className="bg-bg-surface border border-bg-border rounded-xl px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-primary">
                    {r.reviewer.displayName ?? r.reviewer.username}
                  </span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={
                          i < r.rating
                            ? "text-neon-yellow fill-neon-yellow"
                            : "text-bg-border"
                        }
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-xs text-text-subtle">{r.comment}</p>
                )}
                <p className="text-xs text-text-muted/60 mt-1">
                  {formatDate(r.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
