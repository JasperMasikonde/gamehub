import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { RankPushUserSearch } from "@/components/admin/RankPushUserSearch";
import { RankPushProviderToggle } from "@/components/admin/RankPushProviderToggle";
import { formatDate } from "@/lib/utils/format";
import { Users } from "lucide-react";

export default async function AdminRankPushProvidersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const providers = await prisma.user.findMany({
    where: { isRankPusher: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      email: true,
      status: true,
      isRankPusher: true,
      createdAt: true,
      _count: { select: { rankPushOrdersAsProvider: { where: { status: "COMPLETED" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-neon-purple" />
        <h1 className="text-xl font-bold">Rank Push Providers</h1>
      </div>

      {/* Search + toggle */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Find User &amp; Toggle Provider Status</h2>
        </CardHeader>
        <CardContent>
          <RankPushUserSearch />
        </CardContent>
      </Card>

      {/* Current providers */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Current Providers ({providers.length})</h2>
        </CardHeader>
        <CardContent className="p-0">
          {providers.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No providers yet.</p>
          ) : (
            <div className="divide-y divide-bg-border">
              {providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-text-muted">
                          {p.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {p.displayName ?? p.username}
                      </p>
                      <p className="text-xs text-text-muted">
                        {p.email} · {p._count.rankPushOrdersAsProvider} completed
                      </p>
                      <p className="text-xs text-text-muted">
                        Member since {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </div>
                  <RankPushProviderToggle userId={p.id} isRankPusher={p.isRankPusher} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
