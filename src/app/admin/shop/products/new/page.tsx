import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/shop/ProductForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  const bucket = process.env.GCS_BUCKET_NAME!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/shop/products" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Product</h1>
          <p className="text-text-muted text-sm">Add a product to the shop</p>
        </div>
      </div>
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
        <ProductForm categories={categories} gcsBucket={bucket} />
      </div>
    </div>
  );
}
