export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/gcs";
import { ProductCard } from "@/components/shop/ProductCard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.productCategory.findUnique({
    where: { slug, isActive: true },
    include: {
      products: {
        where: { status: "ACTIVE" },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!category) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/shop" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          {category.description && <p className="text-text-muted text-sm mt-0.5">{category.description}</p>}
        </div>
      </div>

      {category.products.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
          <p>No products in this category yet.</p>
          <Link href="/shop" className="text-neon-blue text-sm hover:underline mt-2 inline-block">Browse all products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {category.products.map((p) => (
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
    </div>
  );
}
