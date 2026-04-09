import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SHOP_PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

type ShopPaid = (typeof SHOP_PAID)[number];

export async function GET(req: NextRequest) {
  try { await requireSuperAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const shopPaid: ShopPaid[] = [...SHOP_PAID];

  async function streamRevenue(start: Date, end: Date, allTime = false) {
    const dateFilter = allTime ? {} : {
      completedAt: { gte: start, lt: end },
    };
    const shopDateFilter = allTime ? {} : { createdAt: { gte: start, lt: end } };
    const joinedFilter = allTime ? {} : { joinedAt: { gte: start, lt: end } };

    const [mp, ch, sh, rp, tp] = await Promise.all([
      prisma.transaction.aggregate({
        where: { status: "COMPLETED", ...(allTime ? {} : { completedAt: { gte: start, lt: end } }) },
        _sum: { platformFee: true },
      }),
      prisma.challenge.aggregate({
        where: { status: "COMPLETED", platformFee: { not: null }, ...(allTime ? {} : { completedAt: { gte: start, lt: end } }) },
        _sum: { platformFee: true },
      }),
      prisma.shopOrder.aggregate({
        where: { status: { in: shopPaid }, ...shopDateFilter },
        _sum: { total: true },
      }),
      prisma.rankPushOrder.aggregate({
        where: { status: "COMPLETED", ...(allTime ? {} : { completedAt: { gte: start, lt: end } }) },
        _sum: { platformFee: true },
      }),
      prisma.tournamentParticipant.findMany({
        where: { tournament: { requiresPayment: true }, ...joinedFilter },
        select: { tournament: { select: { entryFee: true } } },
      }),
    ]);

    void dateFilter;

    const marketplace = Number(mp._sum?.platformFee ?? 0);
    const challenges = Number(ch._sum?.platformFee ?? 0);
    const shop = Number(sh._sum?.total ?? 0);
    const rankPush = Number(rp._sum?.platformFee ?? 0);
    const tournaments = tp.reduce((s, p) => s + Number(p.tournament.entryFee), 0);
    const total = marketplace + challenges + shop + rankPush + tournaments;
    return { marketplace, challenges, shop, rankPush, tournaments, total };
  }

  const allTime = await streamRevenue(new Date(0), new Date(), true);
  const yearToDate = await streamRevenue(yearStart, yearEnd);

  const monthly = await Promise.all(
    Array.from({ length: 12 }, (_, i) => i).map(async (i) => {
      const start = new Date(year, i, 1);
      const end = new Date(year, i + 1, 1);
      const data = await streamRevenue(start, end);
      return { month: i + 1, ...data };
    })
  );

  const [completedTxCount, completedChallengeCount, completedOrderCount] = await Promise.all([
    prisma.transaction.count({ where: { status: "COMPLETED" } }),
    prisma.challenge.count({ where: { status: "COMPLETED" } }),
    prisma.rankPushOrder.count({ where: { status: "COMPLETED" } }),
  ]);

  return NextResponse.json({
    allTime,
    yearToDate: { year, ...yearToDate },
    monthly,
    counts: { completedTxCount, completedChallengeCount, completedOrderCount },
  });
}
