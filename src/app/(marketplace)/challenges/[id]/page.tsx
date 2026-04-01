import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AcceptChallengePanel } from "@/components/challenges/AcceptChallengePanel";
import { SubmitResultPanel } from "@/components/challenges/SubmitResultPanel";
import { ChallengeChat } from "@/components/challenges/ChallengeChat";
import { RealtimeRefresh } from "@/components/escrow/RealtimeRefresh";
import { RefreshUnreadOnMount } from "@/components/messages/RefreshUnreadOnMount";
import { Swords, Trophy, User, Shield, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-neon-yellow",
  ACTIVE: "text-neon-blue",
  SUBMITTED: "text-neon-purple",
  COMPLETED: "text-neon-green",
  DISPUTED: "text-neon-red",
  CANCELLED: "text-text-muted",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open — waiting for challenger",
  ACTIVE: "In Progress — match underway",
  SUBMITTED: "Awaiting second result",
  COMPLETED: "Completed",
  DISPUTED: "Disputed — admin review",
  CANCELLED: "Cancelled",
};

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      winner: { select: { id: true, username: true, displayName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
  });

  if (!challenge) notFound();

  const isHost = challenge.hostId === session.user.id;
  const isChallenger = challenge.challengerId === session.user.id;
  const isParty = isHost || isChallenger;
  const isAdmin = session.user.role === "ADMIN";

  const admin = challenge.status === "DISPUTED"
    ? await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } })
    : null;

  // Non-parties can view OPEN challenges; others redirect
  if (!isParty && !isAdmin && challenge.status !== "OPEN") redirect("/challenges");

  // Mark inbox messages for this challenge as read
  if (isParty) {
    const otherId = isHost ? challenge.challengerId : challenge.hostId;
    if (otherId) {
      await prisma.message.updateMany({
        where: {
          senderId: otherId,
          recipientId: session.user.id,
          isRead: false,
          content: { startsWith: `[challenge:${id}]` },
        },
        data: { isRead: true },
      });
    }
  }

  const formatLabel = challenge.format === "BEST_OF_3" ? "Best of 3" : "Best of 5";
  const prize = Number(challenge.wagerAmount) * 2;

  // Serialize messages for client component
  const serializedMessages = challenge.messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: {
      id: m.sender.id,
      username: m.sender.username,
      displayName: m.sender.displayName,
    },
  }));

  const myResult = isHost ? challenge.hostResult : challenge.challengerResult;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-5">
      <RealtimeRefresh events={["challenge_update"]} />
      {isParty && <RefreshUnreadOnMount />}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Swords size={18} className="text-neon-purple" />
          <h1 className="text-xl font-bold">{formatLabel} Challenge</h1>
        </div>
        <p className={cn("text-sm font-medium", STATUS_COLORS[challenge.status] ?? "text-text-muted")}>
          {STATUS_LABELS[challenge.status] ?? challenge.status}
        </p>
        <p className="text-xs text-text-muted mt-0.5">Posted {formatDate(challenge.createdAt)}</p>
      </div>

      {/* Wager info */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-text-muted">Wager (each)</p>
              <p className="text-lg font-black text-neon-green">{formatCurrency(challenge.wagerAmount.toString())}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Prize</p>
              <p className="text-lg font-black text-neon-yellow flex items-center justify-center gap-1">
                <Trophy size={14} />
                {formatCurrency(prize.toString())}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Format</p>
              <p className="text-sm font-semibold text-text-primary">{formatLabel}</p>
            </div>
          </div>
          {challenge.description && (
            <p className="text-xs text-text-muted mt-4 pt-4 border-t border-bg-border leading-relaxed">
              {challenge.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Squads */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Squads</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Host */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-bg-surface border border-bg-border overflow-hidden flex items-center justify-center shrink-0">
                  {challenge.host.avatarUrl
                    ? <img src={challenge.host.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <User size={12} className="text-text-muted" />}
                </div>
                <div>
                  <p className="text-xs font-semibold">{challenge.host.displayName ?? challenge.host.username}</p>
                  <p className="text-[10px] text-neon-purple">Host</p>
                </div>
              </div>
              <a href={challenge.hostSquadUrl} target="_blank" rel="noopener noreferrer">
                <img src={challenge.hostSquadUrl} alt="Host squad" className="w-full aspect-video object-cover rounded-lg border border-bg-border hover:border-neon-purple/40 transition-colors" />
              </a>
            </div>

            {/* Challenger */}
            <div className="flex flex-col gap-2">
              {challenge.challenger ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-bg-surface border border-bg-border overflow-hidden flex items-center justify-center shrink-0">
                      {challenge.challenger.avatarUrl
                        ? <img src={challenge.challenger.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <User size={12} className="text-text-muted" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{challenge.challenger.displayName ?? challenge.challenger.username}</p>
                      <p className="text-[10px] text-neon-blue">Challenger</p>
                    </div>
                  </div>
                  {challenge.challengerSquadUrl && (
                    <a href={challenge.challengerSquadUrl} target="_blank" rel="noopener noreferrer">
                      <img src={challenge.challengerSquadUrl} alt="Challenger squad" className="w-full aspect-video object-cover rounded-lg border border-bg-border hover:border-neon-blue/40 transition-colors" />
                    </a>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-24 border-2 border-dashed border-bg-border rounded-lg text-text-muted text-xs gap-1">
                  <Swords size={16} className="opacity-40" />
                  <span>Waiting for challenger</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Winner banner */}
      {challenge.status === "COMPLETED" && challenge.winner && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-neon-green/10 border border-neon-green/30">
          <Trophy size={20} className="text-neon-green shrink-0" />
          <div>
            <p className="text-sm font-bold text-neon-green">
              🏆 {challenge.winner.displayName ?? challenge.winner.username} wins!
            </p>
            <p className="text-xs text-text-muted">Prize: {formatCurrency(prize.toString())}</p>
          </div>
        </div>
      )}

      {/* Disputed banner */}
      {challenge.status === "DISPUTED" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-neon-red/10 border border-neon-red/30">
          <Shield size={18} className="text-neon-red shrink-0" />
          <div>
            <p className="text-sm font-semibold text-neon-red">Result conflict — admin review in progress</p>
            <p className="text-xs text-text-muted mt-0.5">Both parties submitted different results. An admin will resolve this.</p>
          </div>
        </div>
      )}

      {/* Accept panel — shown to non-parties when OPEN */}
      {challenge.status === "OPEN" && !isParty && !isAdmin && (
        <AcceptChallengePanel
          challengeId={id}
          wagerAmount={challenge.wagerAmount.toString()}
          format={challenge.format}
          hostId={challenge.hostId}
        />
      )}

      {/* Submit result — shown to parties when ACTIVE or SUBMITTED */}
      {isParty && (challenge.status === "ACTIVE" || challenge.status === "SUBMITTED") && (
        <SubmitResultPanel
          challengeId={id}
          isHost={isHost}
          alreadySubmitted={myResult !== null}
        />
      )}

      {/* Chat — visible to both parties when ACTIVE or later */}
      {isParty && challenge.status !== "OPEN" && challenge.status !== "CANCELLED" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Match Chat</h2>
                <p className="text-xs text-text-muted">Exchange match codes and communicate here.</p>
              </div>
              {challenge.status === "DISPUTED" && admin && (
                <Link
                  href={`/messages/${admin.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-xs font-medium hover:bg-neon-red/20 transition-colors"
                >
                  <MessageSquare size={12} />
                  Chat with Admin
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ChallengeChat
              challengeId={id}
              myId={session.user.id}
              status={challenge.status}
              initialMessages={serializedMessages}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
