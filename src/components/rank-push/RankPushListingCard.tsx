import Link from "next/link";
import { ShieldCheck, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/format";

interface Provider {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerifiedSeller: boolean;
  rating?: number | null;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  id: string;
  title: string;
  price: string | number;
  currency?: string;
  provider: Provider;
  category: Category;
  completedOrderCount: number;
}

export function RankPushListingCard({
  id,
  title,
  price,
  currency = "KES",
  provider,
  category,
  completedOrderCount,
}: Props) {
  return (
    <Link href={`/rank-push/${id}`} className="block group">
      <Card className="h-full transition-colors group-hover:border-neon-purple/40">
        <CardContent>
          <div className="flex items-start gap-3">
            {/* Provider avatar */}
            <div className="w-10 h-10 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
              {provider.avatarUrl ? (
                <img
                  src={provider.avatarUrl}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-text-muted">
                  {provider.username[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Provider name + badge */}
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs font-medium text-text-primary truncate">
                  {provider.displayName ?? provider.username}
                </span>
                {provider.isVerifiedSeller && (
                  <ShieldCheck size={11} className="text-neon-blue shrink-0" />
                )}
              </div>

              {/* Category */}
              <Badge variant="purple" className="mb-2 text-[10px]">
                {category.name}
              </Badge>

              {/* Title */}
              <p className="text-sm font-semibold text-text-primary leading-snug mb-3 line-clamp-2">
                {title}
              </p>

              {/* Footer: price + stats */}
              <div className="flex items-center justify-between">
                <p className="text-base font-black text-neon-green">
                  {formatCurrency(String(price), currency)}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  {provider.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-neon-yellow fill-neon-yellow" />
                      {provider.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <TrendingUp size={10} />
                    {completedOrderCount} done
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
