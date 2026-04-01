import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";
import { Eye, Star, ShieldCheck, Gamepad2, BadgeCheck } from "lucide-react";
import type { Listing, ListingImage, User } from "@prisma/client";

type ListingWithRelations = Listing & {
  seller: Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerifiedSeller" | "rating" | "role">;
  screenshots: Pick<ListingImage, "id" | "url" | "isCover">[];
};

const PLATFORM_STYLES: Record<string, { label: string; cls: string }> = {
  PS5:    { label: "PS5",    cls: "platform-ps5" },
  PS4:    { label: "PS4",    cls: "platform-ps4" },
  XBOX:   { label: "Xbox",   cls: "platform-xbox" },
  PC:     { label: "PC",     cls: "platform-pc" },
  MOBILE: { label: "Mobile", cls: "platform-mobile" },
};

export function ListingCard({ listing }: { listing: ListingWithRelations }) {
  const coverImage = listing.screenshots[0]?.url;
  const platform = PLATFORM_STYLES[listing.platform] ?? { label: listing.platform, cls: "" };

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <article className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden listing-card-hover flex flex-col h-full">

        {/* Image area */}
        <div className="relative aspect-video bg-bg-elevated overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-bg-border">
              <Gamepad2 size={36} />
              <span className="text-xs text-text-muted">No screenshot</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-transparent" />

          {/* Platform badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${platform.cls}`}>
              {platform.label}
            </span>
          </div>

          {/* Official admin badge */}
          {listing.seller.role === "ADMIN" && (
            <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-green/20 border border-neon-green/40 text-neon-green backdrop-blur-sm">
              <BadgeCheck size={10} className="fill-neon-green/20" />
              Official
            </div>
          )}

          {/* Views */}
          {listing.views > 0 && listing.seller.role !== "ADMIN" && (
            <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] text-white/70 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              <Eye size={10} />
              {listing.views}
            </div>
          )}

          {/* OVR badge on image */}
          {listing.overallRating && (
            <div className="absolute bottom-3 right-3 flex flex-col items-center bg-black/70 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/10">
              <span className="text-xs text-text-muted leading-none">OVR</span>
              <span className="text-lg font-black text-neon-green leading-tight text-glow-green">
                {listing.overallRating}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 p-4 flex-1">
          <div>
            <h3 className="font-semibold text-sm text-text-primary line-clamp-2 leading-snug group-hover:text-neon-green transition-colors">
              {listing.title}
            </h3>

            {(listing.division || listing.region) && (
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                {listing.division && <span>{listing.division}</span>}
                {listing.division && listing.region && <span className="text-bg-border">·</span>}
                {listing.region && <span>{listing.region}</span>}
              </p>
            )}
          </div>

          {/* Featured players */}
          {listing.featuredPlayers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {listing.featuredPlayers.slice(0, 3).map((p) => (
                <span
                  key={p}
                  className="text-[10px] px-1.5 py-0.5 bg-bg-elevated border border-bg-border rounded text-text-muted"
                >
                  {p}
                </span>
              ))}
              {listing.featuredPlayers.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 text-text-muted">
                  +{listing.featuredPlayers.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Price + seller */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-bg-border">
            <div>
              <p className="text-xl font-black text-neon-green text-glow-green">
                {formatCurrency(listing.price.toString())}
              </p>
              {listing.coins && listing.coins > 0 && (
                <p className="text-[10px] text-text-muted">
                  {listing.coins.toLocaleString()} coins
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-6 h-6 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center overflow-hidden">
                {listing.seller.avatarUrl ? (
                  <img src={listing.seller.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-text-muted">
                    {listing.seller.username[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end leading-tight">
                <div className="flex items-center gap-0.5">
                  <span className="truncate max-w-[70px]">
                    {listing.seller.role === "ADMIN"
                      ? "Eshabiki"
                      : (listing.seller.displayName ?? listing.seller.username)}
                  </span>
                  {listing.seller.role === "ADMIN" ? (
                    <BadgeCheck size={10} className="text-neon-green shrink-0" />
                  ) : listing.seller.isVerifiedSeller ? (
                    <ShieldCheck size={10} className="text-neon-blue shrink-0" />
                  ) : null}
                </div>
                {listing.seller.rating && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    <Star size={8} className="text-neon-yellow fill-neon-yellow" />
                    {listing.seller.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
