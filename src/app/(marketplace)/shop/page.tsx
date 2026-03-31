export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/gcs";
import { ProductCard } from "@/components/shop/ProductCard";
import Link from "next/link";
import { ShoppingBag, Zap } from "lucide-react";

export default async function ShopPage() {
  const [categories, featured, products] = await Promise.all([
    prisma.productCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", isFeatured: true },
      take: 4,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-bg-surface via-bg-elevated to-neon-blue/5 border border-bg-border p-8 sm:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-neon-green" />
            <span className="text-xs font-semibold text-neon-green uppercase tracking-widest">Gamer Store</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-text-primary leading-tight">
            Level Up Your<br />
            <span className="text-neon-blue text-glow-blue">Setup</span>
          </h1>
          <p className="text-text-muted mt-4 max-w-md">
            Peripherals, merch, gift cards, and in-game items — everything a gamer needs.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <a href="#products" className="px-5 py-2.5 rounded-xl bg-neon-blue text-bg-base font-semibold text-sm hover:bg-neon-blue/90 transition-colors">
              Shop Now
            </a>
            <Link href="/shop/cart" className="px-5 py-2.5 rounded-xl border border-bg-border text-sm text-text-muted hover:text-text-primary hover:border-bg-elevated transition-colors flex items-center gap-2">
              <ShoppingBag size={14} /> My Cart
            </Link>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-neon-blue/5 blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 w-48 h-48 rounded-full bg-neon-green/5 blur-2xl pointer-events-none" />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Browse Categories</h2>
          <div className="flex gap-3 flex-wrap">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop/category/${cat.slug}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-surface border border-bg-border hover:border-neon-blue/40 hover:text-neon-blue text-sm transition-colors"
              >
                {cat.name}
                <span className="text-xs text-text-muted">({cat._count.products})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-yellow-400" />
            <h2 className="text-lg font-bold">Featured</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price.toString()}
                currency={p.currency}
                imageUrl={p.imageKeys[0] ? getPublicUrl(p.imageKeys[0]) : undefined}
                type={p.type}
                isFeatured={p.isFeatured}
                stock={p.stock}
              />
            ))}
          </div>
        </section>
      )}

      {/* All products */}
      <section id="products">
        <h2 className="text-lg font-bold mb-4">All Products</h2>
        {products.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
            <p>No products available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price.toString()}
                currency={p.currency}
                imageUrl={p.imageKeys[0] ? getPublicUrl(p.imageKeys[0]) : undefined}
                type={p.type}
                isFeatured={p.isFeatured}
                stock={p.stock}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
