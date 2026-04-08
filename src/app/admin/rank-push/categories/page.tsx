import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RankPushCategoryForm } from "@/components/admin/RankPushCategoryForm";
import { RankPushCategoryDelete } from "@/components/admin/RankPushCategoryDelete";
import { Tag } from "lucide-react";

export default async function AdminRankPushCategoriesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const categories = await prisma.rankPushCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { listings: true } },
    },
  });

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Tag size={18} className="text-neon-purple" />
        <h1 className="text-xl font-bold">Rank Push Categories</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Add New Category</h2>
        </CardHeader>
        <CardContent>
          <RankPushCategoryForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            All Categories ({categories.length})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              No categories yet.
            </p>
          ) : (
            <div className="divide-y divide-bg-border">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{cat.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-muted">
                        Order: {cat.sortOrder}
                      </span>
                      <span className="text-xs text-text-muted">
                        · {cat._count.listings} listings
                      </span>
                      <Badge variant={cat.isActive ? "success" : "default"}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <RankPushCategoryDelete id={cat.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
