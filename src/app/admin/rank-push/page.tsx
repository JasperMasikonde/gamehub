import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { TrendingUp, Tag, Users, ClipboardList } from "lucide-react";

export default async function AdminRankPushPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const [providerCount, openOrders, completedOrders, categoryCount] = await Promise.all([
    prisma.user.count({ where: { isRankPusher: true } }),
    prisma.rankPushOrder.count({ where: { status: { in: ["IN_PROGRESS", "DELIVERED", "DISPUTED"] } } }),
    prisma.rankPushOrder.count({ where: { status: "COMPLETED" } }),
    prisma.rankPushCategory.count({ where: { isActive: true } }),
  ]);

  const stats = [
    { label: "Active Providers", value: providerCount, icon: Users, color: "text-neon-blue", href: "/admin/rank-push/providers" },
    { label: "Open Orders", value: openOrders, icon: ClipboardList, color: "text-neon-yellow", href: "/admin/rank-push/orders" },
    { label: "Completed Orders", value: completedOrders, icon: TrendingUp, color: "text-neon-green", href: "/admin/rank-push/orders" },
    { label: "Active Categories", value: categoryCount, icon: Tag, color: "text-neon-purple", href: "/admin/rank-push/categories" },
  ];

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-neon-purple" />
        <h1 className="text-xl font-bold">Rank Push Management</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:border-neon-purple/30 transition-colors">
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={stat.color} />
                    <p className="text-xs text-text-muted">{stat.label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/rank-push/categories", label: "Manage Categories", icon: Tag, desc: "Add, edit, or remove rank push categories" },
          { href: "/admin/rank-push/providers", label: "Manage Providers", icon: Users, desc: "Grant or revoke rank pusher access" },
          { href: "/admin/rank-push/orders", label: "View All Orders", icon: ClipboardList, desc: "Monitor and manage all rank push orders" },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="h-full hover:border-neon-purple/30 transition-colors">
                <CardContent>
                  <Icon size={20} className="text-neon-purple mb-2" />
                  <p className="text-sm font-semibold mb-1">{link.label}</p>
                  <p className="text-xs text-text-muted">{link.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
