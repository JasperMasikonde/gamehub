import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Swords, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20",
  ACTIVE: "text-neon-blue bg-neon-blue/10 border-neon-blue/20",
  SUBMITTED: "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
  COMPLETED: "text-neon-green bg-neon-green/10 border-neon-green/20",
  DISPUTED: "text-neon-red bg-neon-red/10 border-neon-red/20",
  CANCELLED: "text-text-muted bg-bg-elevated border-bg-border",
};

export default async function AdminChallengesPage() {
  const challenges = await prisma.challenge.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      host: { select: { id: true, username: true } },
      challenger: { select: { id: true, username: true } },
      winner: { select: { id: true, username: true } },
    },
  });

  const disputed = challenges.filter((c) => c.status === "DISPUTED");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Swords size={20} className="text-neon-purple" /> Challenges
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {challenges.length} total · {disputed.length} disputed
        </p>
      </div>

      {disputed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neon-red flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} /> Needs Review
          </h2>
          <div className="flex flex-col gap-2">
            {disputed.map((c) => (
              <Link
                key={c.id}
                href={`/admin/challenges/${c.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-neon-red/30 bg-neon-red/5 hover:bg-neon-red/10 transition-colors"
              >
                <AlertTriangle size={16} className="text-neon-red shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {c.host.username} vs {c.challenger?.username ?? "—"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {c.format === "BEST_OF_3" ? "Bo3" : "Bo5"} · Wager {formatCurrency(c.wagerAmount.toString())} each · Prize {formatCurrency((Number(c.wagerAmount) * 2).toString())}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-neon-red font-semibold">Conflicting results</p>
                  <p className="text-xs text-text-muted">{formatDate(c.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                {["Host", "Challenger", "Format", "Wager", "Prize", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {challenges.map((c) => (
                <tr key={c.id} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium">{c.host.username}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {c.challenger?.username ?? <span className="italic">waiting</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {c.format === "BEST_OF_3" ? "Bo3" : "Bo5"}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neon-green">
                    {formatCurrency(c.wagerAmount.toString())}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neon-yellow">
                    {formatCurrency((Number(c.wagerAmount) * 2).toString())}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", STATUS_COLORS[c.status] ?? "text-text-muted")}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/challenges/${c.id}`} className="text-xs text-neon-blue hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {challenges.length === 0 && (
            <p className="text-center text-sm text-text-muted py-8">No challenges yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
