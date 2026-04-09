import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AccountingYearSelector } from "@/components/accounting/AccountingYearSelector";
import { AccountingExportButton } from "@/components/accounting/AccountingExportButton";
import { formatCurrency } from "@/lib/utils/format";
import { TrendingUp, ShoppingBag, Swords, Trophy, CreditCard, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const VAT_RATE = 0.16;

type StreamKey = "marketplace" | "challenges" | "shop" | "rankPush" | "tournaments";

const STREAMS: { key: StreamKey; label: string; icon: React.ElementType; color: string; barColor: string }[] = [
  { key: "marketplace", label: "Marketplace", icon: CreditCard, color: "text-neon-blue", barColor: "bg-neon-blue" },
  { key: "challenges", label: "Challenges", icon: Swords, color: "text-neon-purple", barColor: "bg-neon-purple" },
  { key: "shop", label: "Shop", icon: ShoppingBag, color: "text-neon-green", barColor: "bg-neon-green" },
  { key: "rankPush", label: "Rank Push", icon: TrendingUp, color: "text-neon-yellow", barColor: "bg-neon-yellow" },
  { key: "tournaments", label: "Tournaments", icon: Trophy, color: "text-orange-400", barColor: "bg-orange-400" },
];

async function fetchSummary(year: number) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [mpAll, chAll, shAll, rpAll, tpAll] = await Promise.all([
    prisma.transaction.aggregate({ where: { status: "COMPLETED" }, _sum: { platformFee: true } }),
    prisma.challenge.aggregate({ where: { status: "COMPLETED", platformFee: { not: null } }, _sum: { platformFee: true } }),
    prisma.shopOrder.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } }, _sum: { total: true } }),
    prisma.rankPushOrder.aggregate({ where: { status: "COMPLETED" }, _sum: { platformFee: true } }),
    prisma.tournamentParticipant.findMany({ where: { tournament: { requiresPayment: true } }, select: { tournament: { select: { entryFee: true } } } }),
  ]);

  const allTimeBase = {
    marketplace: Number(mpAll._sum?.platformFee ?? 0),
    challenges: Number(chAll._sum?.platformFee ?? 0),
    shop: Number(shAll._sum?.total ?? 0),
    rankPush: Number(rpAll._sum?.platformFee ?? 0),
    tournaments: tpAll.reduce((s, p) => s + Number(p.tournament.entryFee), 0),
  };
  const allTime = { ...allTimeBase, total: Object.values(allTimeBase).reduce((a, b) => a + b, 0) };

  const months = await Promise.all(
    Array.from({ length: 12 }, (_, i) => i).map(async (i) => {
      const start = new Date(year, i, 1);
      const end = new Date(year, i + 1, 1);
      const [mp, ch, sh, rp, tp] = await Promise.all([
        prisma.transaction.aggregate({ where: { status: "COMPLETED", completedAt: { gte: start, lt: end } }, _sum: { platformFee: true } }),
        prisma.challenge.aggregate({ where: { status: "COMPLETED", completedAt: { gte: start, lt: end }, platformFee: { not: null } }, _sum: { platformFee: true } }),
        prisma.shopOrder.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }, createdAt: { gte: start, lt: end } }, _sum: { total: true } }),
        prisma.rankPushOrder.aggregate({ where: { status: "COMPLETED", completedAt: { gte: start, lt: end } }, _sum: { platformFee: true } }),
        prisma.tournamentParticipant.findMany({ where: { joinedAt: { gte: start, lt: end }, tournament: { requiresPayment: true } }, select: { tournament: { select: { entryFee: true } } } }),
      ]);
      const t = Number(mp._sum?.platformFee ?? 0) + Number(ch._sum?.platformFee ?? 0) + Number(sh._sum?.total ?? 0) + Number(rp._sum?.platformFee ?? 0) + tp.reduce((s, p) => s + Number(p.tournament.entryFee), 0);
      return { month: i + 1, marketplace: Number(mp._sum?.platformFee ?? 0), challenges: Number(ch._sum?.platformFee ?? 0), shop: Number(sh._sum?.total ?? 0), rankPush: Number(rp._sum?.platformFee ?? 0), tournaments: tp.reduce((s, p) => s + Number(p.tournament.entryFee), 0), total: t };
    })
  );

  const ytd = { year, marketplace: 0, challenges: 0, shop: 0, rankPush: 0, tournaments: 0, total: 0 };
  const [mpYtd, chYtd, shYtd, rpYtd, tpYtd] = await Promise.all([
    prisma.transaction.aggregate({ where: { status: "COMPLETED", completedAt: { gte: yearStart, lt: yearEnd } }, _sum: { platformFee: true } }),
    prisma.challenge.aggregate({ where: { status: "COMPLETED", completedAt: { gte: yearStart, lt: yearEnd }, platformFee: { not: null } }, _sum: { platformFee: true } }),
    prisma.shopOrder.aggregate({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }, createdAt: { gte: yearStart, lt: yearEnd } }, _sum: { total: true } }),
    prisma.rankPushOrder.aggregate({ where: { status: "COMPLETED", completedAt: { gte: yearStart, lt: yearEnd } }, _sum: { platformFee: true } }),
    prisma.tournamentParticipant.findMany({ where: { joinedAt: { gte: yearStart, lt: yearEnd }, tournament: { requiresPayment: true } }, select: { tournament: { select: { entryFee: true } } } }),
  ]);
  ytd.marketplace = Number(mpYtd._sum?.platformFee ?? 0);
  ytd.challenges = Number(chYtd._sum?.platformFee ?? 0);
  ytd.shop = Number(shYtd._sum?.total ?? 0);
  ytd.rankPush = Number(rpYtd._sum.platformFee ?? 0);
  ytd.tournaments = tpYtd.reduce((s, p) => s + Number(p.tournament.entryFee), 0);
  ytd.total = ytd.marketplace + ytd.challenges + ytd.shop + ytd.rankPush + ytd.tournaments;

  return { allTime: allTime as Record<StreamKey | "total", number>, yearToDate: ytd as Record<StreamKey | "total" | "year", number>, monthly: months };
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await resolveSession();
  if (!session?.user?.isSuperAdmin) redirect("/admin");

  const { year: yearParam } = await searchParams;
  const year = parseInt(yearParam ?? String(new Date().getFullYear()));

  const { allTime, yearToDate, monthly } = await fetchSummary(year);

  const ytdVat = yearToDate.total * VAT_RATE;
  const ytdNet = yearToDate.total - ytdVat;
  const maxMonthly = Math.max(...monthly.map((m) => m.total), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-neon-green" />
            <h1 className="text-xl font-bold">Accounting</h1>
          </div>
          <p className="text-sm text-text-muted mt-0.5">Platform revenue, fees, and tax summary — super admin only</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AccountingYearSelector currentYear={year} />
          <AccountingExportButton year={year} />
          <Link
            href="/admin/accounting/ledger"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <ExternalLink size={12} /> Ledger
          </Link>
        </div>
      </div>

      {/* YTD KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `YTD Revenue (${year})`, value: yearToDate.total, color: "text-neon-green", sub: `${year} total` },
          { label: "VAT Payable (16%)", value: ytdVat, color: "text-neon-red", sub: "estimated" },
          { label: "Net After VAT", value: ytdNet, color: "text-neon-blue", sub: "taxable net" },
          { label: "All-Time Revenue", value: allTime.total, color: "text-neon-yellow", sub: "since launch" },
        ].map(({ label, value, color, sub }) => (
          <Card key={label}>
            <CardContent>
              <p className="text-xs text-text-muted">{label}</p>
              <p className={`text-xl font-black mt-1 ${color}`}>{formatCurrency(value.toFixed(2))}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue by stream */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">Revenue by Stream — {year}</h2></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {STREAMS.map(({ key, label, icon: Icon, color, barColor }) => {
                const amount = yearToDate[key] ?? 0;
                const pct = yearToDate.total > 0 ? (amount / yearToDate.total) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
                        <Icon size={12} /> {label}
                      </span>
                      <span className="text-xs font-semibold">{formatCurrency(amount.toFixed(2))}</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} opacity-70 transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">{pct.toFixed(1)}% of total</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quarterly breakdown */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">Quarterly Tax Summary — {year}</h2></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-xs text-text-muted">
                  <th className="text-left pb-2">Quarter</th>
                  <th className="text-right pb-2">Revenue</th>
                  <th className="text-right pb-2">VAT (16%)</th>
                  <th className="text-right pb-2">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {[1, 2, 3, 4].map((q) => {
                  const rev = monthly.slice((q - 1) * 3, q * 3).reduce((s, m) => s + m.total, 0);
                  const vat = rev * VAT_RATE;
                  return (
                    <tr key={q} className="text-xs">
                      <td className="py-2 font-medium">Q{q} {year}</td>
                      <td className="py-2 text-right text-neon-green font-semibold">{formatCurrency(rev.toFixed(2))}</td>
                      <td className="py-2 text-right text-neon-red">{formatCurrency(vat.toFixed(2))}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency((rev - vat).toFixed(2))}</td>
                    </tr>
                  );
                })}
                <tr className="text-xs font-bold border-t-2 border-bg-border">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right text-neon-green">{formatCurrency(yearToDate.total.toFixed(2))}</td>
                  <td className="pt-2 text-right text-neon-red">{formatCurrency(ytdVat.toFixed(2))}</td>
                  <td className="pt-2 text-right">{formatCurrency(ytdNet.toFixed(2))}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">Monthly Revenue — {year}</h2></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 sm:gap-1.5 h-40">
            {monthly.map((m) => {
              const height = (m.total / maxMonthly) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative w-full flex flex-col justify-end" style={{ height: "120px" }}>
                    <div
                      className="w-full rounded-t bg-neon-green/50 hover:bg-neon-green transition-colors cursor-default"
                      style={{ height: `${Math.max(height, m.total > 0 ? 2 : 0)}%` }}
                      title={`${MONTH_NAMES[m.month - 1]}: ${formatCurrency(m.total.toFixed(2))}`}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-text-muted">{MONTH_NAMES[m.month - 1]}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly detail table */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">Monthly Breakdown — {year}</h2></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-bg-border text-text-muted">
                  <th className="text-left px-3 py-2">Month</th>
                  {STREAMS.map((s) => <th key={s.key} className="text-right px-3 py-2">{s.label}</th>)}
                  <th className="text-right px-3 py-2 font-bold">Total</th>
                  <th className="text-right px-3 py-2 text-neon-red">VAT</th>
                  <th className="text-right px-3 py-2">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {monthly.map((m) => {
                  const vat = m.total * VAT_RATE;
                  return (
                    <tr key={m.month} className="hover:bg-bg-elevated/40 transition-colors">
                      <td className="px-3 py-2 font-medium">{MONTH_NAMES[m.month - 1]}</td>
                      {STREAMS.map((s) => (
                        <td key={s.key} className="px-3 py-2 text-right text-text-muted">
                          {(m as Record<string, number>)[s.key] > 0 ? formatCurrency((m as Record<string, number>)[s.key].toFixed(2)) : "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold text-neon-green">{m.total > 0 ? formatCurrency(m.total.toFixed(2)) : "—"}</td>
                      <td className="px-3 py-2 text-right text-neon-red">{m.total > 0 ? formatCurrency(vat.toFixed(2)) : "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{m.total > 0 ? formatCurrency((m.total - vat).toFixed(2)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-bg-border font-bold text-sm">
                  <td className="px-3 py-2">Total</td>
                  {STREAMS.map((s) => (
                    <td key={s.key} className="px-3 py-2 text-right">{formatCurrency(yearToDate[s.key].toFixed(2))}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-neon-green">{formatCurrency(yearToDate.total.toFixed(2))}</td>
                  <td className="px-3 py-2 text-right text-neon-red">{formatCurrency(ytdVat.toFixed(2))}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(ytdNet.toFixed(2))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
