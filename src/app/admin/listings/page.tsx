import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ListingStatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AdminListingActions } from "@/components/admin/AdminListingActions";

export default async function AdminListingsPage() {
  const listings = await prisma.listing.findMany({
    where: { status: { in: ["PENDING_APPROVAL", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { username: true } },
      screenshots: { where: { isCover: true }, take: 1 },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Listings</h1>
        <p className="text-sm text-text-muted">{listings.length} listings to review</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Listing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Seller</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {l.screenshots[0] && (
                        <img
                          src={l.screenshots[0].url}
                          alt=""
                          className="w-12 h-8 object-cover rounded border border-bg-border shrink-0"
                        />
                      )}
                      <span className="max-w-[200px] truncate text-text-primary text-xs font-medium">
                        {l.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {l.seller.username}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neon-green">
                    {formatCurrency(l.price.toString())}
                  </td>
                  <td className="px-4 py-3">
                    <ListingStatusPill status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatDate(l.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <AdminListingActions
                      listingId={l.id}
                      status={l.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listings.length === 0 && (
            <p className="text-center text-sm text-text-muted py-8">
              No listings to review
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
