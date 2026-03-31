export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await prisma.productCategory.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-text-muted text-sm mt-1">{categories.length} total</p>
        </div>
        <Link href="/admin/shop/categories/new">
          <Button variant="primary" size="sm"><Plus size={15} /> New Category</Button>
        </Link>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="text-left p-4 text-text-muted font-medium">Category</th>
              <th className="text-left p-4 text-text-muted font-medium">Slug</th>
              <th className="text-left p-4 text-text-muted font-medium">Products</th>
              <th className="text-left p-4 text-text-muted font-medium">Sort</th>
              <th className="text-left p-4 text-text-muted font-medium">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {categories.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-text-muted">No categories yet.</td></tr>
            )}
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-bg-elevated transition-colors">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 text-text-muted font-mono text-xs">{c.slug}</td>
                <td className="p-4 text-text-muted">{c._count.products}</td>
                <td className="p-4 text-text-muted">{c.sortOrder}</td>
                <td className="p-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${c.isActive ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-text-muted/10 text-text-muted border-bg-border"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <Link href={`/admin/shop/categories/${c.id}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-neon-blue transition-colors">
                    <Pencil size={13} /> Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
