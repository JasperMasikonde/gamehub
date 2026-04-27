export const dynamic = "force-dynamic";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BannersManager } from "@/components/admin/BannersManager";

export default async function AdminBannersPage() {
  await requirePermission("MANAGE_TOURNAMENTS");

  const [banners, tournaments] = await Promise.all([
    prisma.promoBanner.findMany({
      orderBy: { createdAt: "desc" },
      include: { tournament: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.tournament.findMany({
      where: { status: { not: "DRAFT" } },
      select: { id: true, name: true, slug: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Promo Banners</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Manage banners shown to visitors — announcement bars, hero spotlights, and feature cards.
        </p>
      </div>
      <BannersManager initialBanners={banners} tournaments={tournaments} />
    </div>
  );
}
