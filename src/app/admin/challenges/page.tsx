import { requirePermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatChallengeFormat } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Swords, AlertTriangle, Settings, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ChallengeWindowSettings } from "@/components/admin/ChallengeWindowSettings";
import { MatchCodePatternForm } from "@/components/admin/MatchCodePatternForm";
import { DeleteDemoChallengesButton } from "@/components/admin/DeleteDemoChallengesButton";
import { Code } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20",
  ACTIVE: "text-neon-blue bg-neon-blue/10 border-neon-blue/20",
  SUBMITTED: "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
  COMPLETED: "text-neon-green bg-neon-green/10 border-neon-green/20",
  DISPUTED: "text-neon-red bg-neon-red/10 border-neon-red/20",
  CANCELLED: "text-text-muted bg-bg-elevated border-bg-border",
};

const TABS = [
  { key: "challenges", label: "Challenges", icon: LayoutList },
  { key: "settings",   label: "Settings",   icon: Settings },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function AdminChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tab?: string }>;
}) {
  try { await requirePermission("MANAGE_CHALLENGES"); } catch { redirect("/admin"); }

  const { status: statusParam, tab: tabParam } = await searchParams;
  const activeTab: Tab = (tabParam as Tab) ?? "challenges";
  const filterStatus = statusParam && statusParam !== "ALL" ? statusParam : undefined;

  const challenges = await prisma.challenge.findMany({
    where: filterStatus ? { status: filterStatus as never } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      host: { select: { id: true, username: true } },
      challenger: { select: { id: true, username: true } },
      winner: { select: { id: true, username: true } },
    },
  });

  const disputed = challenges.filter((c) => c.status === "DISPUTED");

  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  const resultWindowMinutes = config?.challengeResultWindowMinutes ?? 60;
  const matchCodePattern = config?.matchCodePattern ?? "^\\d{4}-?\\d{4}$";
  const matchCodeHint = config?.matchCodeHint ?? "8 digits, e.g. 12345678 or 1234-5678";

  const STATUSES = ["ALL", "OPEN", "ACTIVE", "SUBMITTED", "COMPLETED", "DISPUTED", "CANCELLED"];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Swords size={20} className="text-neon-purple" /> Challenges
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {challenges.length} total · {disputed.length} disputed
        </p>
      </div>

      {/* Subtabs */}
      <div className="flex gap-1 border-b border-bg-border">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <Link
              key={key}
              href={`/admin/challenges?tab=${key}`}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-neon-purple text-neon-purple"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* ── TAB: Challenges ── */}
      {activeTab === "challenges" && (
        <>
          {/* Disputed alert */}
          {disputed.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neon-red/30 bg-neon-red/5 text-sm">
              <AlertTriangle size={14} className="text-neon-red shrink-0" />
              <span className="text-neon-red font-medium">{disputed.length} disputed challenge{disputed.length !== 1 ? "s" : ""} need review</span>
              <Link href="/admin/disputes" className="ml-auto text-xs text-neon-red underline hover:opacity-80">
                Go to Disputes →
              </Link>
            </div>
          )}

          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => {
              const active = (s === "ALL" && !filterStatus) || s === filterStatus;
              return (
                <Link
                  key={s}
                  href={s === "ALL" ? "/admin/challenges?tab=challenges" : `/admin/challenges?tab=challenges&status=${s}`}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    active
                      ? "bg-neon-purple/10 border-neon-purple/30 text-neon-purple"
                      : "bg-bg-elevated border-bg-border text-text-muted hover:text-text-primary"
                  )}
                >
                  {s === "ALL" ? "All" : s}
                </Link>
              );
            })}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-bg-border">
                    {["Host", "Challenger", "Format", "Wager", "Prize", "Winner", "Status", "Date", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {challenges.map((c) => {
                    const pool = Number(c.wagerAmount) * 2;
                    const cPlatFee = c.platformFee != null ? Number(c.platformFee) : 0;
                    const cTxFee = c.transactionFee != null ? Number(c.transactionFee) : 0;
                    const netPrize = pool - cPlatFee - cTxFee;

                    return (
                      <tr
                        key={c.id}
                        className={cn(
                          "hover:bg-bg-elevated/50 transition-colors",
                          c.status === "COMPLETED" && "bg-neon-green/[0.03]"
                        )}
                      >
                        <td className="px-4 py-3 text-xs font-medium">{c.host.username}</td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {c.challenger?.username ?? <span className="italic">waiting</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {formatChallengeFormat(c.format, true)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-neon-green">
                          {formatCurrency(c.wagerAmount.toString())}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-neon-yellow">
                          {formatCurrency(netPrize.toString())}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-neon-green">
                          {c.winner?.username ?? <span className="text-text-muted font-normal">—</span>}
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
                    );
                  })}
                </tbody>
              </table>
              {challenges.length === 0 && (
                <p className="text-center text-sm text-text-muted py-8">No challenges yet</p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ── TAB: Settings ── */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-6">
          <ChallengeWindowSettings currentMinutes={resultWindowMinutes} />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Code size={16} className="text-neon-purple" />
              <h2 className="text-base font-semibold">Match Code Format</h2>
            </div>
            <p className="text-xs text-text-muted">
              Controls what codes players can submit when sharing a match code. Uses a JavaScript regex tested against the full code string.
            </p>
            <MatchCodePatternForm currentPattern={matchCodePattern} currentHint={matchCodeHint} />
          </section>

          <hr className="border-bg-border" />

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Demo Data</h2>
            <p className="text-xs text-text-muted">
              Use <code className="bg-bg-elevated px-1 rounded text-[11px]">npm run db:seed-demo</code> to populate the site with camera-ready challenges for recordings. Delete them here when done.
            </p>
            <DeleteDemoChallengesButton />
          </section>
        </div>
      )}
    </div>
  );
}
