import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { ShieldCheck, Wallet } from "lucide-react";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      isVerifiedSeller: true,
      totalSales: true,
      totalPurchases: true,
      createdAt: true,
      wallet: { select: { balance: true } },
    },
  });

  const statusVariant = (s: string) =>
    s === "ACTIVE" ? "success" : s === "BANNED" ? "danger" : "warning";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Users</h1>
        <p className="text-sm text-text-muted">{users.length} total</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-bg-border">
                {["User", "Role", "Status", "Wallet", "Sales", "Purchases", "Joined", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-text-muted"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-text-primary">
                          {u.username}
                        </p>
                        {u.isVerifiedSeller && (
                          <ShieldCheck size={11} className="text-neon-blue" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={u.role === "ADMIN" ? "danger" : u.role === "SELLER" ? "info" : "default"}
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(u.status) as "success" | "danger" | "warning"}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.wallet ? (
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-1 text-xs font-semibold text-neon-green hover:underline">
                        <Wallet size={11} />
                        {formatCurrency(u.wallet.balance.toString())}
                      </Link>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{u.totalSales}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{u.totalPurchases}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs text-neon-blue hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
