import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RankPushListingCard } from "@/components/rank-push/RankPushListingCard";
import { Button } from "@/components/ui/Button";
import { Plus, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Rank Push Services | Eshabiki",
  description:
    "Hire pro gamers to boost your eFootball rank. Browse rank push services with M-Pesa escrow protection.",
};

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function RankPushPage({ searchParams }: Props) {
  const { category } = await searchParams;

  const [categories, listings, session] = await Promise.all([
    prisma.rankPushCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.rankPushListing.findMany({
      where: {
        isActive: true,
        ...(category ? { categoryId: category } : {}),
      },
      include: {
        provider: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerifiedSeller: true,
            rating: true,
          },
        },
        category: { select: { id: true, name: true } },
        _count: { select: { orders: { where: { status: "COMPLETED" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    auth(),
  ]);

  const isRankPusher = (session?.user as { isRankPusher?: boolean } | undefined)?.isRankPusher ?? false;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={22} className="text-neon-purple" />
            Rank Push Services
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Hire pro gamers to boost your eFootball account rank — escrow protected.
          </p>
        </div>
        {isRankPusher && (
          <Link href="/rank-push/create">
            <Button variant="primary" size="sm">
              <Plus size={14} /> Create Listing
            </Button>
          </Link>
        )}
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/rank-push"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !category
                ? "bg-neon-purple/20 border-neon-purple/40 text-neon-purple"
                : "border-bg-border text-text-muted hover:text-text-primary hover:border-bg-border/60"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/rank-push?category=${cat.id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                category === cat.id
                  ? "bg-neon-purple/20 border-neon-purple/40 text-neon-purple"
                  : "border-bg-border text-text-muted hover:text-text-primary hover:border-bg-border/60"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Listings grid */}
      {listings.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold">No services yet</p>
          <p className="text-sm mt-1">Check back soon or browse all categories.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <RankPushListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              price={listing.price.toString()}
              currency={listing.currency}
              provider={listing.provider}
              category={listing.category}
              completedOrderCount={listing._count.orders}
            />
          ))}
        </div>
      )}
    </div>
  );
}
