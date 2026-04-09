import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SHOP_PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
const VAT_RATE = 0.16;

export async function GET(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const quarter = searchParams.get("quarter");

  let start: Date;
  let end: Date;
  let periodLabel: string;

  if (quarter) {
    const q = parseInt(quarter);
    start = new Date(year, (q - 1) * 3, 1);
    end = new Date(year, (q - 1) * 3 + 3, 1);
    periodLabel = `Q${q}-${year}`;
  } else {
    start = new Date(year, 0, 1);
    end = new Date(year + 1, 0, 1);
    periodLabel = `Full-Year-${year}`;
  }

  const [txs, challenges, shopOrders, rankPushOrders, participants] = await Promise.all([
    prisma.transaction.findMany({
      where: { status: "COMPLETED", completedAt: { gte: start, lt: end } },
      include: { buyer: { select: { username: true } }, seller: { select: { username: true } }, listing: { select: { title: true } } },
      orderBy: { completedAt: "asc" },
    }),
    prisma.challenge.findMany({
      where: { status: "COMPLETED", completedAt: { gte: start, lt: end }, platformFee: { not: null } },
      include: { host: { select: { username: true } }, challenger: { select: { username: true } } },
      orderBy: { completedAt: "asc" },
    }),
    prisma.shopOrder.findMany({
      where: { status: { in: [...SHOP_PAID] }, createdAt: { gte: start, lt: end } },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.rankPushOrder.findMany({
      where: { status: "COMPLETED", completedAt: { gte: start, lt: end } },
      include: { client: { select: { username: true } }, listing: { select: { title: true } } },
      orderBy: { completedAt: "asc" },
    }),
    prisma.tournamentParticipant.findMany({
      where: { tournament: { requiresPayment: true }, joinedAt: { gte: start, lt: end } },
      include: { tournament: { select: { name: true, entryFee: true } }, user: { select: { username: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  type Row = { date: string; type: string; description: string; party: string; gross: number; revenue: number; vat: number; net: number; reference: string };
  const rows: Row[] = [];

  const mkRow = (date: Date, type: string, description: string, party: string, gross: number, revenue: number, reference: string): Row => {
    const vat = Math.round(revenue * VAT_RATE * 100) / 100;
    return { date: date.toISOString().slice(0, 10), type, description, party, gross, revenue, vat, net: Math.round((revenue - vat) * 100) / 100, reference };
  };

  for (const t of txs) rows.push(mkRow(t.completedAt ?? t.createdAt, "Marketplace", t.listing.title, `${t.buyer.username} -> ${t.seller.username}`, Number(t.amount), Number(t.platformFee), t.id));
  for (const c of challenges) rows.push(mkRow(c.completedAt ?? c.createdAt, "Challenge", `${c.format === "BEST_OF_3" ? "BO3" : "BO5"} Challenge`, `${c.host.username} vs ${c.challenger?.username ?? "—"}`, Number(c.wagerAmount) * 2, Number(c.platformFee), c.id));
  for (const o of shopOrders) rows.push(mkRow(o.createdAt, "Shop", `Shop Order #${o.id.slice(-6).toUpperCase()}`, o.user.username, Number(o.total), Number(o.total), o.id));
  for (const o of rankPushOrders) rows.push(mkRow(o.completedAt ?? o.createdAt, "Rank Push", o.listing.title, o.client.username, Number(o.amount), Number(o.platformFee), o.id));
  for (const p of participants) rows.push(mkRow(p.joinedAt, "Tournament", p.tournament.name, p.user.username, Number(p.tournament.entryFee), Number(p.tournament.entryFee), p.tournamentId));

  rows.sort((a, b) => a.date.localeCompare(b.date));

  const totals = rows.reduce((acc, r) => ({ gross: acc.gross + r.gross, revenue: acc.revenue + r.revenue, vat: acc.vat + r.vat, net: acc.net + r.net }), { gross: 0, revenue: 0, vat: 0, net: 0 });

  const esc = (v: string | number) => { const s = String(v); return (s.includes(",") || s.includes('"')) ? `"${s.replace(/"/g, '""')}"` : s; };

  const lines = [
    `Eshabiki Accounting Export — ${periodLabel.replace(/-/g, " ")}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    `VAT Rate: 16% (Kenya)`,
    "",
    ["Date", "Type", "Description", "Party", "Gross (KES)", "Revenue (KES)", "VAT 16% (KES)", "Net Revenue (KES)", "Reference ID"].join(","),
    ...rows.map((r) => [r.date, r.type, esc(r.description), esc(r.party), r.gross.toFixed(2), r.revenue.toFixed(2), r.vat.toFixed(2), r.net.toFixed(2), r.reference].join(",")),
    "",
    ["TOTALS", "", "", "", totals.gross.toFixed(2), totals.revenue.toFixed(2), totals.vat.toFixed(2), totals.net.toFixed(2), ""].join(","),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eshabiki-accounting-${periodLabel}.csv"`,
    },
  });
}
