import { requireAdmin } from "@/lib/auth";
import { CategoryForm } from "@/components/shop/CategoryForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewCategoryPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/shop/categories" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Category</h1>
          <p className="text-text-muted text-sm">Add a product category</p>
        </div>
      </div>
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
        <CategoryForm />
      </div>
    </div>
  );
}
