import { Suspense } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingFilters } from "@/components/listings/ListingFilters";
import { SortSelect } from "@/components/listings/SortSelect";
import { prisma } from "@/lib/prisma";
import { Gamepad2 } from "lucide-react";
import { Platform } from "@prisma/client";

interface SearchParams {
  search?: string;
  platform?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
}

type SortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "popular";

const SORT_MAP: Record<SortKey, object> = {
  newest:     { createdAt: "desc" },
  oldest:     { createdAt: "asc" },
  price_asc:  { price: "asc" },
  price_desc: { price: "desc" },
  popular:    { views: "desc" },
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const pageSize = 20;
  const sort = (params.sort ?? "newest") as SortKey;
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.newest;

  const where = {
    status: "ACTIVE" as const,
    isPrivateDeal: false,
    ...(params.platform && Object.values(Platform).includes(params.platform as Platform)
      ? { platform: params.platform as Platform }
      : {}),
    ...(params.minPrice || params.maxPrice
      ? {
          price: {
            ...(params.minPrice ? { gte: parseFloat(params.minPrice) } : {}),
            ...(params.maxPrice ? { lte: parseFloat(params.maxPrice) } : {}),
          },
        }
      : {}),
    ...(params.search
      ? {
          OR: [
            { title: { contains: params.search, mode: "insensitive" as const } },
            { description: { contains: params.search, mode: "insensitive" as const } },
            { featuredPlayers: { has: params.search } },
          ],
        }
      : {}),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: {
        seller: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedSeller: true, rating: true, role: true },
        },
        screenshots: { where: { isCover: true }, take: 1 },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Build query string for pagination links
  const qp = new URLSearchParams();
  if (params.search) qp.set("search", params.search);
  if (params.platform) qp.set("platform", params.platform);
  if (params.minPrice) qp.set("minPrice", params.minPrice);
  if (params.maxPrice) qp.set("maxPrice", params.maxPrice);
  if (sort !== "newest") qp.set("sort", sort);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <aside className="lg:w-60 shrink-0">
        <Suspense fallback={<div className="bg-bg-surface border border-bg-border rounded-xl p-4 h-64 skeleton" />}>
          <ListingFilters />
        </Suspense>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Gamepad2 size={20} className="text-neon-green" />
            eFootball Accounts
            <span className="text-sm text-text-muted font-normal">
              ({total.toLocaleString()})
            </span>
          </h1>
          <Suspense fallback={null}>
            <SortSelect current={sort} />
          </Suspense>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-24">
            <Gamepad2 size={56} className="mx-auto mb-4 text-bg-border" />
            <p className="font-semibold text-text-subtle text-lg">No listings found</p>
            <p className="text-sm text-text-muted mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {page > 1 && (
              <a
                href={`/listings?${qp.toString()}&page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary border border-bg-border hover:border-neon-blue transition-colors"
              >
                Prev
              </a>
            )}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={`/listings?${qp.toString()}&page=${p}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-neon-blue text-bg-primary font-bold"
                    : "bg-bg-surface text-text-muted hover:text-text-primary border border-bg-border"
                }`}
              >
                {p}
              </a>
            ))}
            {page < totalPages && (
              <a
                href={`/listings?${qp.toString()}&page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary border border-bg-border hover:border-neon-blue transition-colors"
              >
                Next
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
