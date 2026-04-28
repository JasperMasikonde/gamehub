import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate } from "@/lib/socket-server";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("propose"),
    scheduledAt: z.string().datetime({ message: "Must be a valid ISO date-time" }),
  }),
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await resolveSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isHost = challenge.hostId === session.user.id;
  const isChallenger = challenge.challengerId === session.user.id;
  if (!isHost && !isChallenger)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (challenge.status !== "ACTIVE" && challenge.status !== "SUBMITTED")
    return NextResponse.json({ error: "Time can only be set on an active challenge" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const otherId = isHost ? challenge.challengerId! : challenge.hostId;
  const myName = session.user.username;

  // ── PROPOSE ─────────────────────────────────────────────────────────────
  if (parsed.data.action === "propose") {
    const proposedAt = new Date(parsed.data.scheduledAt);
    const now = new Date();
    if (proposedAt <= now)
      return NextResponse.json({ error: "Proposed time must be in the future" }, { status: 400 });
    if (proposedAt > new Date(now.getTime() + 12 * 60 * 60 * 1000))
      return NextResponse.json({ error: "Match time must be within the next 12 hours" }, { status: 400 });

    const updated = await prisma.challenge.update({
      where: { id },
      data: {
        proposedMatchTime: proposedAt,
        proposedByHost: isHost,
        // Clear previous agreement if re-proposing
        scheduledAt: null,
        resultDeadlineAt: null,
      },
    });

    const timeStr = proposedAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
    await createNotification(otherId, "CHALLENGE_SCHEDULED", {
      title: "Match time proposed",
      body: `${myName} proposed playing at ${timeStr}. Open the challenge to accept or counter-propose.`,
      linkUrl: `/challenges/${id}`,
    });
    emitToast(otherId, {
      type: "info",
      title: "Match time proposed",
      message: `${myName} suggested ${timeStr}. Accept or propose a different time.`,
      linkUrl: `/challenges/${id}`,
      linkLabel: "View →",
      duration: 10000,
    });
    emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

    return NextResponse.json({ challenge: updated });
  }

  // ── ACCEPT ──────────────────────────────────────────────────────────────
  if (parsed.data.action === "accept") {
    // Only the OTHER party (not the proposer) can accept
    const proposedByHost = challenge.proposedByHost;
    if ((isHost && proposedByHost === true) || (isChallenger && proposedByHost === false))
      return NextResponse.json({ error: "You cannot accept your own proposal" }, { status: 400 });

    if (!challenge.proposedMatchTime)
      return NextResponse.json({ error: "No pending proposal to accept" }, { status: 400 });

    const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
    const windowMinutes = config?.challengeResultWindowMinutes ?? 60;
    const scheduledAt = challenge.proposedMatchTime;
    const resultDeadlineAt = new Date(scheduledAt.getTime() + windowMinutes * 60 * 1000);

    const updated = await prisma.challenge.update({
      where: { id },
      data: {
        scheduledAt,
        resultDeadlineAt,
        proposedMatchTime: null,
        proposedByHost: null,
      },
    });

    const timeStr = scheduledAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
    await createNotification(otherId, "CHALLENGE_SCHEDULED", {
      title: "Match time confirmed!",
      body: `${myName} accepted ${timeStr}. You can now exchange match codes.`,
      linkUrl: `/challenges/${id}`,
    });
    emitToast(otherId, {
      type: "success",
      title: "Match time confirmed!",
      message: `${myName} accepted your proposed time. Chat is now unlocked.`,
      linkUrl: `/challenges/${id}`,
      linkLabel: "Exchange codes →",
      duration: 10000,
    });
    emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

    return NextResponse.json({ challenge: updated });
  }

  // ── DECLINE ─────────────────────────────────────────────────────────────
  if (!challenge.proposedMatchTime)
    return NextResponse.json({ error: "No pending proposal to decline" }, { status: 400 });

  const updated = await prisma.challenge.update({
    where: { id },
    data: { proposedMatchTime: null, proposedByHost: null },
  });

  await createNotification(otherId, "CHALLENGE_SCHEDULED", {
    title: "Match time declined",
    body: `${myName} declined your proposed time. Propose a new one.`,
    linkUrl: `/challenges/${id}`,
  });
  emitToast(otherId, {
    type: "warning",
    title: "Match time declined",
    message: `${myName} declined your proposed time. Suggest another time.`,
    linkUrl: `/challenges/${id}`,
    linkLabel: "View →",
    duration: 8000,
  });
  emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

  return NextResponse.json({ challenge: updated });
}
