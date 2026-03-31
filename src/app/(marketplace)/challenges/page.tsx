import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Swords, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const session = await auth();

  const challenges = await prisma.challenge.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
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

      {challenges.length === 0 ? (
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
          {challenges.map((c) => (
            <Link key={c.id} href={`/challenges/${c.id}`}>
              <Card className="hover:border-neon-purple/30 transition-colors cursor-pointer">
                <CardContent>
                  <div className="flex items-center gap-4">
                    {/* Host squad preview */}
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
                        {c.host.displayName ?? c.host.username}
                        <span className="text-text-muted font-normal"> is looking for a challenger</span>
                      </p>
                      {c.description && (
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{c.description}</p>
                      )}
                      <p className="text-xs text-text-muted mt-1">Posted {formatDate(c.createdAt)}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-neon-green">
                        {formatCurrency(c.wagerAmount.toString())}
                      </p>
                      <p className="text-xs text-text-muted">wager</p>
                      <div className="mt-2">
                        <span className="text-xs text-neon-purple font-medium flex items-center gap-1 justify-end">
                          <Trophy size={10} />
                          {formatCurrency((Number(c.wagerAmount) * 2).toString())} prize
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
