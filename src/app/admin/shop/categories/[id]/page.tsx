import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "@/components/shop/CategoryForm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const category = await prisma.productCategory.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/shop/categories" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Category</h1>
          <p className="text-text-muted text-sm">{category.name}</p>
        </div>
      </div>
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
        <CategoryForm
          categoryId={category.id}
          defaultValues={{
            name: category.name,
            slug: category.slug,
            description: category.description ?? undefined,
            imageUrl: category.imageUrl ?? undefined,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
          }}
        />
      </div>
    </div>
  );
}
