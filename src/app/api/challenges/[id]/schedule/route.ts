import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate } from "@/lib/socket-server";

const schema = z.object({
  scheduledAt: z.string().datetime({ message: "Must be a valid ISO date-time" }),
});

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
  if (challenge.status !== "ACTIVE")
    return NextResponse.json({ error: "Match time can only be set on an active challenge" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (scheduledAt <= new Date()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }

  // Compute result submission deadline from SiteConfig
  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  const windowMinutes = config?.challengeResultWindowMinutes ?? 60;
  const resultDeadlineAt = new Date(scheduledAt.getTime() + windowMinutes * 60 * 1000);

  const updated = await prisma.challenge.update({
    where: { id },
    data: { scheduledAt, resultDeadlineAt },
  });

  // Notify the other party
  const otherId = isHost ? challenge.challengerId! : challenge.hostId;
  const setterName = session.user.username;

  await createNotification(otherId, "CHALLENGE_SCHEDULED", {
    title: "Match time set",
    body: `${setterName} scheduled your match for ${scheduledAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}. Results must be submitted within ${windowMinutes} minutes after that.`,
    linkUrl: `/challenges/${id}`,
  });
  emitToast(otherId, {
    type: "info",
    title: "Match time set",
    message: `${setterName} scheduled the match. Check the challenge for details.`,
    linkUrl: `/challenges/${id}`,
    linkLabel: "View →",
    duration: 8000,
  });

  emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

  return NextResponse.json({ challenge: updated });
}
