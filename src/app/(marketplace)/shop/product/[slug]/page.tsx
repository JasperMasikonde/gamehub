export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/gcs";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { ProductImageGallery } from "@/components/shop/ProductImageGallery";
import Link from "next/link";
import { ArrowLeft, Tag, Package } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  PERIPHERAL: "Peripheral", MERCH: "Merch", GIFT_CARD: "Gift Card", IN_GAME_ITEM: "In-Game Item",
};

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, status: "ACTIVE" },
    include: { category: { select: { name: true, slug: true } } },
  });
  if (!product) notFound();

  const imageUrls = product.imageKeys.map((k) => getPublicUrl(k));
  const inStock = product.stock === -1 || product.stock > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-2 mb-8 text-sm text-text-muted">
        <Link href="/shop" className="hover:text-text-primary transition-colors">Shop</Link>
        <span>/</span>
        <Link href={`/shop/category/${product.category.slug}`} className="hover:text-text-primary transition-colors">{product.category.name}</Link>
        <span>/</span>
        <span className="text-text-primary">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <ProductImageGallery imageUrls={imageUrls} name={product.name} />

        {/* Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-text-muted border border-bg-border px-2 py-0.5 rounded-full">
                {TYPE_LABELS[product.type] ?? product.type}
              </span>
              {product.isFeatured && (
                <span className="text-xs font-bold text-neon-green border border-neon-green/30 bg-neon-green/10 px-2 py-0.5 rounded-full">
                  Featured
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary">{product.name}</h1>
            <p className="text-3xl font-bold text-neon-green mt-3">
              {product.currency} {Number(product.price).toLocaleString()}
            </p>
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            <Package size={14} className={inStock ? "text-neon-green" : "text-neon-red"} />
            <span className={inStock ? "text-neon-green" : "text-neon-red"}>
              {product.stock === -1 ? "In Stock" : product.stock === 0 ? "Out of Stock" : `${product.stock} in stock`}
            </span>
          </div>

          <AddToCartButton productId={product.id} inStock={inStock} className="w-full justify-center py-3" />

          {/* Description */}
          <div>
            <h2 className="font-semibold text-sm mb-2">Description</h2>
            <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs text-text-muted border border-bg-border px-2.5 py-1 rounded-full">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
