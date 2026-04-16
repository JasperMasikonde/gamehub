import { requirePermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Swords, AlertTriangle, Phone, Banknote, Settings, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ChallengeWindowSettings } from "@/components/admin/ChallengeWindowSettings";
import { MatchCodePatternForm } from "@/components/admin/MatchCodePatternForm";
import { AdminPayoutActions } from "@/components/admin/AdminPayoutActions";
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
  { key: "payouts", label: "Payouts", icon: Banknote },
  { key: "settings", label: "Settings", icon: Settings },
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
  const completed = challenges.filter((c) => c.status === "COMPLETED" && c.winnerId);

  // Fetch M-Pesa phone numbers for challenge winners
  const completedIds = completed.map((c) => c.id);
  const challengePayments = completedIds.length > 0
    ? await prisma.payment.findMany({
        where: {
          entityId: { in: completedIds },
          purpose: { in: ["challenge_host", "challenge"] },
          status: "COMPLETED",
        },
        select: { entityId: true, purpose: true, phone: true, userId: true },
      })
    : [];

  const phoneMap = new Map<string, { hostPhone?: string; challengerPhone?: string }>();
  for (const p of challengePayments) {
    const entry = phoneMap.get(p.entityId) ?? {};
    if (p.purpose === "challenge_host") entry.hostPhone = p.phone;
    if (p.purpose === "challenge") entry.challengerPhone = p.phone;
    phoneMap.set(p.entityId, entry);
  }

  const winnerIds = completed.filter((c) => c.winnerId).map((c) => c.winnerId!);
  const payoutRequests = completedIds.length > 0
    ? await prisma.payoutRequest.findMany({
        where: {
          OR: [
            { challengeId: { in: completedIds } },
            ...(winnerIds.length > 0 ? [{ userId: { in: winnerIds }, challengeId: null }] : []),
          ],
          status: { not: "REJECTED" },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, challengeId: true, userId: true, amount: true, phone: true, status: true },
      })
    : [];

  const payoutMap = new Map<string, { id: string; status: "PENDING" | "APPROVED" | "PAID"; amount: number; phone: string }>();
  for (const c of completed) {
    if (!c.winnerId) continue;
    const linked = payoutRequests.find((r) => r.challengeId === c.id);
    const fallback = payoutRequests.find((r) => r.userId === c.winnerId && !r.challengeId);
    const req = linked ?? fallback;
    if (req) payoutMap.set(c.id, { id: req.id, status: req.status as "PENDING" | "APPROVED" | "PAID", amount: Number(req.amount), phone: req.phone });
  }

  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  const resultWindowMinutes = config?.challengeResultWindowMinutes ?? 60;
  const matchCodePattern = config?.matchCodePattern ?? "^\\d{4}-?\\d{4}$";
  const matchCodeHint = config?.matchCodeHint ?? "8 digits, e.g. 12345678 or 1234-5678";

  const STATUSES = ["ALL", "OPEN", "ACTIVE", "SUBMITTED", "COMPLETED", "DISPUTED", "CANCELLED"];

  // Counts for tab badges
  const pendingPayouts = completed.filter((c) => {
    const req = payoutMap.get(c.id);
    return req && req.status !== "PAID";
  }).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Swords size={20} className="text-neon-purple" /> Challenges
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {challenges.length} total · {disputed.length} disputed · {completed.length} awaiting payout
        </p>
      </div>

      {/* Subtabs */}
      <div className="flex gap-1 border-b border-bg-border">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          const badge = key === "payouts" && pendingPayouts > 0 ? pendingPayouts : null;
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
              {badge && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neon-green/15 text-neon-green">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── TAB: Challenges ── */}
      {activeTab === "challenges" && (
        <>
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
                    {["Host", "Challenger", "Format", "Wager", "Prize", "Winner", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {challenges.map((c) => {
                    const phones = phoneMap.get(c.id);
                    const winnerIsHost = c.winnerId === c.host.id;
                    const payoutPhone = winnerIsHost ? phones?.hostPhone : phones?.challengerPhone;
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
                          {c.format === "BEST_OF_3" ? "Bo3" : "Bo5"}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-neon-green">
                          {formatCurrency(c.wagerAmount.toString())}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-neon-yellow">
                          {formatCurrency(netPrize.toString())}
                        </td>
                        <td className="px-4 py-3">
                          {c.winner ? (
                            <div>
                              <p className="text-xs font-semibold text-neon-green">{c.winner.username}</p>
                              {payoutPhone && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Phone size={9} className="text-neon-green shrink-0" />
                                  <span className="text-[10px] font-mono text-neon-green">{payoutPhone}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
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

      {/* ── TAB: Payouts ── */}
      {activeTab === "payouts" && (
        <div className="flex flex-col gap-6">
          {/* Disputed — needs review */}
          {disputed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-neon-red flex items-center gap-1.5 mb-2">
                <AlertTriangle size={14} /> Needs Review — {disputed.length} disputed
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
                        {c.format === "BEST_OF_3" ? "Bo3" : "Bo5"} · Wager {formatCurrency(c.wagerAmount.toString())} each · Winner gets {formatCurrency(
                          (Number(c.wagerAmount) * 2 - (Number(c.platformFee) || 0) - (Number(c.transactionFee) || 0)).toString()
                        )}
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

          {/* Completed — payout list */}
          {completed.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-neon-green flex items-center gap-1.5 mb-2">
                <Banknote size={14} /> Awaiting Payout — {completed.length} winner{completed.length !== 1 ? "s" : ""}
              </h2>
              <div className="flex flex-col gap-2">
                {completed.map((c) => {
                  const phones = phoneMap.get(c.id);
                  const winnerIsHost = c.winnerId === c.host.id;
                  const payoutPhone = winnerIsHost ? phones?.hostPhone : phones?.challengerPhone;
                  const pool = Number(c.wagerAmount) * 2;
                  const platFee = c.platformFee != null ? Number(c.platformFee) : 0;
                  const txFee = c.transactionFee != null ? Number(c.transactionFee) : 0;
                  const winnerPayout = pool - platFee - txFee;
                  const payoutReq = payoutMap.get(c.id);

                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-neon-green/25 bg-neon-green/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-neon-green/15 flex items-center justify-center shrink-0">
                        <Swords size={14} className="text-neon-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">
                          {c.winner?.username}
                          <span className="text-text-muted font-normal text-xs ml-1">won</span>
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {c.host.username} vs {c.challenger?.username ?? "—"} · {c.format === "BEST_OF_3" ? "Bo3" : "Bo5"}
                        </p>
                        <Link href={`/admin/challenges/${c.id}`} className="text-[10px] text-neon-blue hover:underline">
                          View challenge →
                        </Link>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="text-base font-black text-neon-green">{formatCurrency(winnerPayout.toString())}</p>
                        {(platFee > 0 || txFee > 0) && (
                          <p className="text-[10px] text-text-muted">Pool {formatCurrency(pool.toString())} − fees {formatCurrency((platFee + txFee).toString())}</p>
                        )}
                        {payoutReq ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Phone size={10} className="text-neon-green" />
                              <span className="text-xs font-mono font-semibold text-neon-green">{payoutReq.phone}</span>
                            </div>
                            <AdminPayoutActions
                              payoutId={payoutReq.id}
                              status={payoutReq.status}
                              phone={payoutReq.phone}
                              amount={payoutReq.amount}
                            />
                          </>
                        ) : payoutPhone ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Phone size={10} className="text-neon-green" />
                              <span className="text-xs font-mono font-semibold text-neon-green">{payoutPhone}</span>
                            </div>
                            <span className="text-[10px] text-text-muted italic">no payout request yet</span>
                          </>
                        ) : (
                          <span className="text-xs text-text-muted italic">waiting for payout request</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted py-4">No completed challenges awaiting payout.</p>
          )}

          {disputed.length === 0 && completed.length === 0 && (
            <p className="text-sm text-text-muted py-4">No disputes or pending payouts.</p>
          )}
        </div>
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
