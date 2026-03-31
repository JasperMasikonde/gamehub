export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getPublicUrl } from "@/lib/gcs";
import { Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/Button";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-neon-green/10 text-neon-green border-neon-green/20",
  DRAFT: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  ARCHIVED: "bg-text-muted/10 text-text-muted border-bg-border",
};

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-text-muted text-sm mt-1">{products.length} total</p>
        </div>
        <Link href="/admin/shop/products/new">
          <Button variant="primary" size="sm"><Plus size={15} /> New Product</Button>
        </Link>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                <th className="text-left p-4 text-text-muted font-medium">Product</th>
                <th className="text-left p-4 text-text-muted font-medium">Category</th>
                <th className="text-left p-4 text-text-muted font-medium">Price</th>
                <th className="text-left p-4 text-text-muted font-medium">Stock</th>
                <th className="text-left p-4 text-text-muted font-medium">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {products.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-text-muted">No products yet.</td></tr>
              )}
              {products.map((p) => {
                const imgUrl = p.imageKeys[0] ? getPublicUrl(p.imageKeys[0]) : null;
                return (
                  <tr key={p.id} className="hover:bg-bg-elevated transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-bg-border overflow-hidden shrink-0">
                          {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-text-muted">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-text-muted">{p.category.name}</td>
                    <td className="p-4 font-semibold text-neon-green">KES {Number(p.price).toLocaleString()}</td>
                    <td className="p-4 text-text-muted">{p.stock === -1 ? "∞" : p.stock}</td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[p.status] ?? ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/admin/shop/products/${p.id}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-neon-blue transition-colors">
                        <Pencil size={13} /> Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
