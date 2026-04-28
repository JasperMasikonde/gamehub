import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToAdmins } from "@/lib/socket-server";

const createSchema = z.object({
  format: z.enum(["BEST_OF_3", "BEST_OF_5"]),
  wagerAmount: z.coerce.number().positive(),
  description: z.string().max(500).optional(),
  hostSquadUrl: z.string().min(1, "Squad screenshot is required"),
  whatsappNumber: z.string().max(20).optional(),
});

// GET /api/challenges — list open challenges
export async function GET(_req: NextRequest) {
  const challenges = await prisma.challenge.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ challenges });
}

// POST /api/challenges — create a challenge
export async function POST(req: NextRequest) {
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { format, wagerAmount, description, hostSquadUrl, whatsappNumber } = parsed.data;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Enforce min/max wager from SiteConfig
  const siteConf = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  if (siteConf) {
    const min = Number(siteConf.minWagerAmount);
    const max = siteConf.maxWagerAmount ? Number(siteConf.maxWagerAmount) : null;
    if (wagerAmount < min)
      return NextResponse.json({ error: `Minimum wager is KES ${min.toLocaleString()}` }, { status: 400 });
    if (max !== null && wagerAmount > max)
      return NextResponse.json({ error: `Maximum wager is KES ${max.toLocaleString()}` }, { status: 400 });
  }

  // Look up the applicable fee rule so we can store it with the challenge
  const feeRule = await prisma.platformFeeRule.findFirst({
    where: { isActive: true, minWager: { lte: wagerAmount }, maxWager: { gte: wagerAmount } },
    orderBy: { minWager: "asc" },
  });

  const challenge = await prisma.challenge.create({
    data: {
      hostId: session.user.id,
      format,
      wagerAmount,
      currency: "KES",
      description,
      hostSquadUrl,
      expiresAt,
      status: "PENDING_HOST_PAYMENT",
      platformFee: feeRule ? feeRule.fee : null,
      transactionFee: feeRule ? feeRule.transactionFee : null,
    },
  });

  if (whatsappNumber) {
    await prisma.user.update({ where: { id: session.user.id }, data: { whatsappNumber } });
  }

  // Notify admins of new challenge (optional awareness)
  emitToAdmins({
    type: "info",
    title: "New challenge posted",
    message: `${session.user.username} posted a ${format.replace("_", " ")} challenge for KSh ${wagerAmount}`,
    linkUrl: `/challenges/${challenge.id}`,
    linkLabel: "View →",
  });

  return NextResponse.json({ challenge }, { status: 201 });
}
