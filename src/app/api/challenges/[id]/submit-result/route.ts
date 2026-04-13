import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitToast, emitToAdmins, emitChallengeUpdate } from "@/lib/socket-server";
import { creditWallet } from "@/lib/wallet";
import { sendAdminNotification } from "@/lib/email";

const schema = z.object({
  result: z.enum(["HOST_WIN", "CHALLENGER_WIN"]),
});

export async function POST(
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
    return NextResponse.json({ error: "Challenge is not in progress" }, { status: 400 });

  // Enforce result submission deadline if a match time was set
  if (challenge.resultDeadlineAt && new Date() > challenge.resultDeadlineAt) {
    return NextResponse.json(
      { error: "The result submission window for this match has closed. Contact an admin." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }

  const { result } = parsed.data;

  // Prevent double submission
  if (isHost && challenge.hostResult)
    return NextResponse.json({ error: "You already submitted a result" }, { status: 400 });
  if (isChallenger && challenge.challengerResult)
    return NextResponse.json({ error: "You already submitted a result" }, { status: 400 });

  const updateData: Record<string, unknown> = isHost
    ? { hostResult: result }
    : { challengerResult: result };

  const hostResult = isHost ? result : challenge.hostResult;
  const challengerResult = isChallenger ? result : challenge.challengerResult;

  // Both submitted — check agreement
  if (hostResult && challengerResult) {
    if (hostResult === challengerResult) {
      // Agreement — determine winner
      const winnerId = hostResult === "HOST_WIN" ? challenge.hostId : challenge.challengerId!;
      updateData.status = "COMPLETED";
      updateData.winnerId = winnerId;
      updateData.completedAt = new Date();

      const updated = await prisma.challenge.update({ where: { id }, data: updateData });

      // Credit winner's wallet: wager * 2 − platformFee − transactionFee
      const wager = Number(challenge.wagerAmount);
      const platFee = challenge.platformFee ? Number(challenge.platformFee) : 0;
      const txFee = challenge.transactionFee ? Number(challenge.transactionFee) : 0;
      const totalFee = platFee + txFee;
      const payout = wager * 2 - totalFee;
      await creditWallet({
        userId: winnerId,
        amount: payout,
        type: "CHALLENGE_WIN",
        description: `Challenge win payout (KES ${(wager * 2).toFixed(2)} pool − KES ${totalFee.toFixed(2)} fees)`,
        challengeId: id,
      });

      // Notify both parties
      const loserId = winnerId === challenge.hostId ? challenge.challengerId! : challenge.hostId;
      await Promise.all([
        createNotification(winnerId, "CHALLENGE_WON", {
          title: "You won the challenge! 🏆",
          body: `KES ${payout.toFixed(2)} has been credited to your wallet.`,
          linkUrl: `/challenges/${id}`,
        }),
        createNotification(loserId, "CHALLENGE_LOST", {
          title: "Challenge result confirmed",
          body: `The challenge result has been confirmed. Better luck next time.`,
          linkUrl: `/challenges/${id}`,
        }),
      ]);
      emitToast(winnerId, { type: "success", title: "You won! 🏆", message: `KES ${payout.toFixed(2)} has been credited to your wallet.`, linkUrl: `/challenges/${id}`, linkLabel: "View result", duration: 10000 });
      emitToast(loserId, { type: "info", title: "Match result confirmed", message: "The result has been recorded.", linkUrl: `/challenges/${id}`, linkLabel: "View result", duration: 8000 });
      emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

      // Notify admin via email (fire-and-forget)
      prisma.siteConfig.findUnique({ where: { id: "singleton" } }).then((cfg) => {
        if (!cfg?.adminNotificationEmail) return;
        sendAdminNotification({
          toEmail: cfg.adminNotificationEmail,
          subject: "Challenge completed — payout required",
          eventTitle: "Challenge completed",
          eventBody: `Challenge #${id.slice(-8)} has been completed. Winner payout: KES ${payout.toFixed(2)}. Send via M-Pesa from the challenges admin panel.`,
          linkUrl: `/admin/challenges/${id}`,
          linkLabel: "View challenge →",
        }).catch(console.error);
      }).catch(console.error);

      return NextResponse.json({ challenge: updated });
    } else {
      // Conflict — send to admin
      updateData.status = "DISPUTED";

      const updated = await prisma.challenge.update({ where: { id }, data: updateData });

      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await Promise.all(
        admins.map((a) =>
          createNotification(a.id, "CHALLENGE_DISPUTE", {
            title: "Challenge result conflict",
            body: `Two parties submitted conflicting results for challenge #${id.slice(-8)}. Review required.`,
            linkUrl: `/admin/challenges/${id}`,
          })
        )
      );
      emitToAdmins({
        type: "warning",
        title: "Challenge result conflict",
        message: `Parties disagree on challenge #${id.slice(-8)} result`,
        linkUrl: `/admin/challenges/${id}`,
        linkLabel: "Review →",
        duration: 0,
      });
      emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

      return NextResponse.json({ challenge: updated });
    }
  }

  // Only one submitted so far
  updateData.status = "SUBMITTED";
  const updated = await prisma.challenge.update({ where: { id }, data: updateData });

  // Notify the other party
  const otherId = isHost ? challenge.challengerId! : challenge.hostId;
  await createNotification(otherId, "CHALLENGE_RESULT_SUBMITTED", {
    title: "Opponent submitted result",
    body: "Your opponent has submitted their match result. Please submit yours.",
    linkUrl: `/challenges/${id}`,
  });
  emitToast(otherId, {
    type: "info",
    title: "Opponent submitted result",
    message: "Submit your result to confirm the match outcome.",
    linkUrl: `/challenges/${id}`,
    linkLabel: "Submit now →",
    duration: 10000,
  });
  emitChallengeUpdate(challenge.hostId, challenge.challengerId, id);

  return NextResponse.json({ challenge: updated });
}
