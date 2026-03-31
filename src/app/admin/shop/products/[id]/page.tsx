import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/shop/ProductForm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.productCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  const bucket = process.env.GCS_BUCKET_NAME!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/shop/products" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Product</h1>
          <p className="text-text-muted text-sm">{product.name}</p>
        </div>
      </div>
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
        <ProductForm
          categories={categories}
          gcsBucket={bucket}
          productId={product.id}
          defaultValues={{
            name: product.name,
            slug: product.slug,
            categoryId: product.categoryId,
            type: product.type,
            price: String(product.price),
            stock: product.stock,
            description: product.description,
            imageKeys: product.imageKeys,
            tags: product.tags,
            isFeatured: product.isFeatured,
            status: product.status,
          }}
        />
      </div>
    </div>
  );
}
