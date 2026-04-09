import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SHOP_PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export interface LedgerEntry {
  id: string;
  date: string;
  type: "MARKETPLACE" | "CHALLENGE" | "SHOP" | "TOURNAMENT" | "RANK_PUSH";
  description: string;
  gross: number;
  revenue: number;
  reference: string;
  party: string;
}

export async function GET(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 50;
  const type = searchParams.get("type") ?? "ALL";
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  const entries: LedgerEntry[] = [];

  if (type === "ALL" || type === "MARKETPLACE") {
    const txs = await prisma.transaction.findMany({
      where: {
        status: "COMPLETED",
        ...(from || to ? { completedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: {
        buyer: { select: { username: true } },
        seller: { select: { username: true } },
        listing: { select: { title: true } },
      },
      orderBy: { completedAt: "desc" },
    });
    for (const t of txs) {
      entries.push({ id: t.id, date: (t.completedAt ?? t.createdAt).toISOString(), type: "MARKETPLACE", description: t.listing.title, gross: Number(t.amount), revenue: Number(t.platformFee), reference: t.id, party: `${t.buyer.username} → ${t.seller.username}` });
    }
  }

  if (type === "ALL" || type === "CHALLENGE") {
    const challenges = await prisma.challenge.findMany({
      where: {
        status: "COMPLETED",
        platformFee: { not: null },
        ...(from || to ? { completedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { host: { select: { username: true } }, challenger: { select: { username: true } } },
      orderBy: { completedAt: "desc" },
    });
    for (const c of challenges) {
      entries.push({ id: c.id, date: (c.completedAt ?? c.createdAt).toISOString(), type: "CHALLENGE", description: `${c.format === "BEST_OF_3" ? "BO3" : "BO5"} Challenge`, gross: Number(c.wagerAmount) * 2, revenue: Number(c.platformFee), reference: c.id, party: `${c.host.username} vs ${c.challenger?.username ?? "—"}` });
    }
  }

  if (type === "ALL" || type === "SHOP") {
    const orders = await prisma.shopOrder.findMany({
      where: {
        status: { in: [...SHOP_PAID] },
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    });
    for (const o of orders) {
      entries.push({ id: o.id, date: o.createdAt.toISOString(), type: "SHOP", description: `Shop Order #${o.id.slice(-6).toUpperCase()}`, gross: Number(o.total), revenue: Number(o.total), reference: o.id, party: o.user.username });
    }
  }

  if (type === "ALL" || type === "RANK_PUSH") {
    const orders = await prisma.rankPushOrder.findMany({
      where: {
        status: "COMPLETED",
        ...(from || to ? { completedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { client: { select: { username: true } }, provider: { select: { username: true } }, listing: { select: { title: true } } },
      orderBy: { completedAt: "desc" },
    });
    for (const o of orders) {
      entries.push({ id: o.id, date: (o.completedAt ?? o.createdAt).toISOString(), type: "RANK_PUSH", description: o.listing.title, gross: Number(o.amount), revenue: Number(o.platformFee), reference: o.id, party: `${o.client.username} (provider: ${o.provider.username})` });
    }
  }

  if (type === "ALL" || type === "TOURNAMENT") {
    const participants = await prisma.tournamentParticipant.findMany({
      where: {
        tournament: { requiresPayment: true },
        ...(from || to ? { joinedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { tournament: { select: { id: true, name: true, entryFee: true } }, user: { select: { username: true } } },
      orderBy: { joinedAt: "desc" },
    });
    for (const p of participants) {
      entries.push({ id: `${p.tournamentId}-${p.userId}`, date: p.joinedAt.toISOString(), type: "TOURNAMENT", description: p.tournament.name, gross: Number(p.tournament.entryFee), revenue: Number(p.tournament.entryFee), reference: p.tournamentId, party: p.user.username });
    }
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = entries.length;
  const paginated = entries.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({ entries: paginated, total, page, pageSize });
}
