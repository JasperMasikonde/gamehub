import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: string | number;
  currency?: string;
  imageUrl?: string;
  type: string;
  isFeatured?: boolean;
  stock: number;
}

export function ProductCard({ slug, name, price, currency = "KES", imageUrl, type, isFeatured, stock }: ProductCardProps) {
  const inStock = stock === -1 || stock > 0;
  const typeLabel: Record<string, string> = {
    PERIPHERAL: "Peripheral",
    MERCH: "Merch",
    GIFT_CARD: "Gift Card",
    IN_GAME_ITEM: "In-Game Item",
  };

  return (
    <Link href={`/shop/product/${slug}`} className="group block">
      <div className={cn(
        "relative bg-bg-surface border border-bg-border rounded-xl overflow-hidden transition-all duration-300",
        "hover:border-neon-blue/40 hover:shadow-lg hover:shadow-neon-blue/5 hover:-translate-y-0.5",
        isFeatured && "border-neon-green/30"
      )}>
        {/* Image */}
        <div className="aspect-square bg-bg-elevated overflow-hidden relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart size={40} className="text-text-muted opacity-30" />
            </div>
          )}
          {isFeatured && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-green text-bg-base">
              FEATURED
            </span>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-bg-base/60 flex items-center justify-center">
              <span className="text-xs font-bold text-text-muted border border-bg-border px-3 py-1 rounded-full bg-bg-surface">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-wide mb-1">
            {typeLabel[type] ?? type}
          </p>
          <h3 className="text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-neon-blue transition-colors">
            {name}
          </h3>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-base font-bold text-neon-green">
              {currency} {Number(price).toLocaleString()}
            </p>
            {inStock && stock !== -1 && stock <= 5 && (
              <span className="text-[10px] text-neon-red font-semibold">Only {stock} left</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
