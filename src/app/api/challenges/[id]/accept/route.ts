import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitChallengeUpdate } from "@/lib/socket-server";

const acceptSchema = z.object({
  challengerSquadUrl: z.string().min(1, "Squad screenshot is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.hostId === session.user.id)
    return NextResponse.json({ error: "You cannot accept your own challenge" }, { status: 400 });
  if (challenge.status !== "OPEN")
    return NextResponse.json({ error: "Challenge is no longer open" }, { status: 409 });

  const body = await req.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { challengerSquadUrl } = parsed.data;

  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      challengerId: session.user.id,
      challengerSquadUrl,
      status: "ACTIVE",
    },
  });

  // Notify host
  await createNotification(challenge.hostId, "CHALLENGE_ACCEPTED", {
    title: "Challenge accepted!",
    body: `${session.user.username} accepted your match challenge. Head to the challenge room.`,
    linkUrl: `/challenges/${id}`,
  });
  emitToast(challenge.hostId, {
    type: "success",
    title: "Challenge accepted!",
    message: `${session.user.username} is ready to play. Exchange match codes in the chat.`,
    linkUrl: `/challenges/${id}`,
    linkLabel: "Go to challenge →",
    duration: 10000,
  });

  emitChallengeUpdate(challenge.hostId, session.user.id, id);

  return NextResponse.json({ challenge: updated });
}
