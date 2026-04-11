import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "eFootball Match Challenges",
  description: "Challenge other players to wager-based eFootball matches in Kenya. Win the pot. Powered by M-Pesa.",
  openGraph: {
    title: "eFootball Match Challenges — Eshabiki",
    description: "Wager-based eFootball 1v1 matches. Beat your opponent and win the prize pot.",
  },
};

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Swords, Plus, Trophy, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

type Tab = "open" | "active" | "completed";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "open", label: "Open", icon: Swords },
  { key: "active", label: "My Active", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "active" || tabParam === "completed" ? tabParam : "open";

  const userId = session?.user?.id;

  let challenges;

  if (tab === "open") {
    challenges = await prisma.challenge.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  } else if (tab === "active") {
    challenges = userId
      ? await prisma.challenge.findMany({
          where: {
            status: { in: ["ACTIVE", "SUBMITTED", "DISPUTED"] },
            OR: [{ hostId: userId }, { challengerId: userId }],
          },
          orderBy: { updatedAt: "desc" },
          include: {
            host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        })
      : [];
  } else {
    challenges = userId
      ? await prisma.challenge.findMany({
          where: {
            status: "COMPLETED",
            OR: [{ hostId: userId }, { challengerId: userId }],
          },
          orderBy: { updatedAt: "desc" },
          include: {
            host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        })
      : [];
  }

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Active",
    SUBMITTED: "Result Submitted",
    DISPUTED: "Disputed",
    COMPLETED: "Completed",
  };

  const STATUS_COLOR: Record<string, string> = {
    ACTIVE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    SUBMITTED: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
    DISPUTED: "bg-neon-red/10 text-neon-red border-neon-red/20",
    COMPLETED: "bg-neon-green/10 text-neon-green border-neon-green/20",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Swords size={22} className="text-neon-purple" />
            Match Challenges
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Wager-based eFootball matches. Beat your opponent to win.
          </p>
        </div>
        {session?.user && (
          <Link href="/challenges/create">
            <Button variant="primary">
              <Plus size={14} />
              Host a Match
            </Button>
          </Link>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-bg-elevated border border-bg-border rounded-xl mb-6">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const disabled = (key === "active" || key === "completed") && !userId;
          return (
            <Link
              key={key}
              href={disabled ? "#" : `/challenges?tab=${key}`}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-bg-surface text-text-primary border border-bg-border shadow-sm"
                  : disabled
                  ? "text-text-muted opacity-40 cursor-not-allowed"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              <Icon size={13} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Login nudge for protected tabs */}
      {(tab === "active" || tab === "completed") && !userId && (
        <Card>
          <CardContent>
            <div className="text-center py-10">
              <Swords size={28} className="mx-auto mb-3 text-text-muted opacity-30" />
              <p className="text-text-muted text-sm">
                <Link href="/login" className="text-neon-blue hover:underline">Sign in</Link> to see your challenges.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open challenges */}
      {tab === "open" && (
        challenges.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <Swords size={32} className="text-text-muted mx-auto mb-3 opacity-40" />
                <p className="text-text-muted text-sm">No open challenges right now.</p>
                {session?.user && (
                  <Link href="/challenges/create">
                    <Button variant="outline" className="mt-4">Be the first to host a match</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {challenges.map((c) => {
              const openC = c as typeof c & { host: { id: string; username: string; displayName: string | null; avatarUrl: string | null } };
              return (
              <Link key={c.id} href={`/challenges/${c.id}`}>
                <Card className="hover:border-neon-purple/30 transition-colors cursor-pointer">
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <img
                        src={c.hostSquadUrl}
                        alt="Squad"
                        className="w-20 h-14 object-cover rounded-lg border border-bg-border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-neon-purple/10 text-neon-purple border border-neon-purple/20 px-2 py-0.5 rounded-full font-medium">
                            {c.format === "BEST_OF_3" ? "Best of 3" : "Best of 5"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-text-primary">
                          {openC.host.displayName ?? openC.host.username}
                          <span className="text-text-muted font-normal"> is looking for a challenger</span>
                        </p>
                        {c.description && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{c.description}</p>
                        )}
                        <p className="text-xs text-text-muted mt-1">Posted {formatDate(c.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <div>
                          <p className="text-lg font-black text-neon-green">
                            {formatCurrency(c.wagerAmount.toString())}
                          </p>
                          <p className="text-xs text-text-muted">wager</p>
                          <span className="text-xs text-neon-purple font-medium flex items-center gap-1 justify-end mt-1">
                            <Trophy size={10} />
                            {formatCurrency((Number(c.wagerAmount) * 2).toString())} prize
                          </span>
                        </div>
                        {/* Only show Accept button for users who are not the host */}
                        {userId !== c.hostId && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-purple text-white text-xs font-semibold">
                            Accept <ArrowRight size={11} />
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              );
            })}
          </div>
        )
      )}

      {/* Active / Completed challenges */}
      {(tab === "active" || tab === "completed") && userId && (
        challenges.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                {tab === "active"
                  ? <Clock size={32} className="text-text-muted mx-auto mb-3 opacity-40" />
                  : <CheckCircle size={32} className="text-text-muted mx-auto mb-3 opacity-40" />
                }
                <p className="text-text-muted text-sm">
                  {tab === "active" ? "No active challenges. " : "No completed challenges yet. "}
                  <Link href="/challenges" className="text-neon-blue hover:underline">Browse open challenges</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {challenges.map((c) => {
              const isHost = c.hostId === userId;
              const cWithChallenger = c as typeof c & { challenger?: { id: string; username: string; displayName: string | null } | null };
              const other = isHost ? cWithChallenger.challenger : c.host;
              const won = tab === "completed" && c.winnerId === userId;
              const lost = tab === "completed" && c.winnerId && c.winnerId !== userId;
              const payout = won
                ? Number(c.wagerAmount) * 2 - (c.platformFee ? Number(c.platformFee) : 0)
                : 0;

              return (
                <Link key={c.id} href={`/challenges/${c.id}`}>
                  <Card className={cn(
                    "hover:border-neon-purple/30 transition-colors cursor-pointer",
                    won && "border-neon-green/20",
                    lost && "border-neon-red/10",
                  )}>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <img
                          src={c.hostSquadUrl}
                          alt="Squad"
                          className="w-20 h-14 object-cover rounded-lg border border-bg-border shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STATUS_COLOR[c.status] ?? "")}>
                              {STATUS_LABEL[c.status] ?? c.status}
                            </span>
                            <span className="text-xs bg-neon-purple/10 text-neon-purple border border-neon-purple/20 px-2 py-0.5 rounded-full font-medium">
                              {c.format === "BEST_OF_3" ? "BO3" : "BO5"}
                            </span>
                            {won && <span className="text-xs text-neon-green font-semibold">You won 🏆</span>}
                            {lost && <span className="text-xs text-neon-red font-semibold">You lost</span>}
                          </div>
                          <p className="text-sm font-semibold text-text-primary">
                            {isHost ? "You" : (cWithChallenger.host?.displayName ?? cWithChallenger.host?.username ?? "?")}
                            <span className="text-text-muted font-normal"> vs </span>
                            {other ? (other.displayName ?? other.username) : "Waiting for opponent"}
                          </p>
                          <p className="text-xs text-text-muted mt-1">{formatDate(c.updatedAt)}</p>
                        </div>
                        {won && (
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-neon-green">
                              {formatCurrency(payout.toString())}
                            </p>
                            <p className="text-xs text-text-muted">you receive</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
