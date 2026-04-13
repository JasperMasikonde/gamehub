import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ChallengeResolvePanel } from "@/components/admin/ChallengeResolvePanel";
import { ChallengeRemovePanel } from "@/components/admin/ChallengeRemovePanel";
import { AdminWalletAdjustPanel } from "@/components/admin/AdminWalletAdjustPanel";
import { AdminQuickMessage } from "@/components/admin/AdminQuickMessage";
import { Swords, Trophy, AlertTriangle, User } from "lucide-react";
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

const RESULT_LABEL: Record<string, string> = {
  HOST_WIN: "Host wins",
  CHALLENGER_WIN: "Challenger wins",
};

export default async function AdminChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      winner: { select: { id: true, username: true, displayName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, username: true, displayName: true } } },
      },
    },
  });

  if (!challenge) notFound();

  const wager = Number(challenge.wagerAmount);
  const prize = wager * 2;
  const fee = challenge.platformFee != null ? Number(challenge.platformFee) : null;
  const txFee = challenge.transactionFee != null ? Number(challenge.transactionFee) : null;
  const totalFee = (fee ?? 0) + (txFee ?? 0);
  const winnerPayout = prize - totalFee;
  const formatLabel = challenge.format === "BEST_OF_3" ? "Best of 3" : "Best of 5";

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <Link href="/admin/challenges" className="text-xs text-text-muted hover:text-text-primary mb-2 inline-block">
          ← All Challenges
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Swords size={18} className="text-neon-purple" /> {formatLabel} Challenge
        </h1>
        <p className={cn("text-sm font-semibold mt-0.5", STATUS_COLORS[challenge.status] ?? "text-text-muted")}>
          {challenge.status}
        </p>
        <p className="text-xs text-text-muted">{formatDate(challenge.createdAt)}</p>
      </div>

      {/* Wager / payout breakdown */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-xs text-text-muted">Wager (each)</p>
              <p className="text-lg font-black text-neon-green">{formatCurrency(challenge.wagerAmount.toString())}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Pool</p>
              <p className="text-lg font-black text-neon-yellow">{formatCurrency(prize.toString())}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Platform Fee</p>
              <p className="text-lg font-black text-neon-red">
                {fee != null ? `− ${formatCurrency(fee.toString())}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Transaction Fee</p>
              <p className="text-lg font-black text-neon-red">
                {txFee != null ? `− ${formatCurrency(txFee.toString())}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Format</p>
              <p className="text-sm font-semibold">{formatLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send to winner */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-neon-green/10 border-2 border-neon-green/40">
        <div className="flex items-center gap-3">
          <Trophy size={22} className="text-neon-green shrink-0" />
          <div>
            <p className="text-xs text-text-muted font-medium">
              {challenge.status === "COMPLETED" && challenge.winner
                ? `Send to ${challenge.winner.displayName ?? challenge.winner.username}`
                : "Winner payout (send via M-Pesa)"}
            </p>
            <p className="text-2xl font-black text-neon-green">{formatCurrency(winnerPayout.toString())}</p>
            {totalFee > 0 && (
              <p className="text-[11px] text-text-muted mt-0.5">
                Pool {formatCurrency(prize.toString())} − fees {formatCurrency(totalFee.toString())}
              </p>
            )}
          </div>
        </div>
        {challenge.status === "COMPLETED" && challenge.winner && (
          <span className="shrink-0 text-xs font-semibold bg-neon-green/20 text-neon-green border border-neon-green/30 px-3 py-1.5 rounded-lg">
            Awaiting payout
          </span>
        )}
      </div>

      {/* Parties */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">Parties</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {[
              { user: challenge.host, role: "Host", result: challenge.hostResult, color: "neon-purple" },
              { user: challenge.challenger, role: "Challenger", result: challenge.challengerResult, color: "neon-blue" },
            ].map(({ user, role, result, color }) => (
              <div key={role} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-bg-surface border border-bg-border overflow-hidden flex items-center justify-center shrink-0">
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <User size={14} className="text-text-muted" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{user?.displayName ?? user?.username ?? "—"}</p>
                    <p className={`text-[10px] text-${color}`}>{role}</p>
                  </div>
                </div>
                {result ? (
                  <p className={cn(
                    "text-xs font-semibold px-2 py-1 rounded-lg border w-fit",
                    result === "HOST_WIN"
                      ? (role === "Host" ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-neon-red bg-neon-red/10 border-neon-red/20")
                      : (role === "Challenger" ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-neon-red bg-neon-red/10 border-neon-red/20")
                  )}>
                    Submitted: {RESULT_LABEL[result]}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted italic">No result yet</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Squad screenshots */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">Squad Screenshots</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1">Host squad</p>
              <a href={challenge.hostSquadUrl} target="_blank" rel="noopener noreferrer">
                <img src={challenge.hostSquadUrl} alt="Host squad" className="w-full aspect-video object-cover rounded-lg border border-bg-border hover:border-neon-purple/40 transition-colors" />
              </a>
            </div>
            {challenge.challengerSquadUrl && (
              <div>
                <p className="text-xs text-text-muted mb-1">Challenger squad</p>
                <a href={challenge.challengerSquadUrl} target="_blank" rel="noopener noreferrer">
                  <img src={challenge.challengerSquadUrl} alt="Challenger squad" className="w-full aspect-video object-cover rounded-lg border border-bg-border hover:border-neon-blue/40 transition-colors" />
                </a>
              </div>
            )}
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
            {challenge.adminNote && (
              <p className="text-xs text-text-muted mt-0.5">Admin note: {challenge.adminNote}</p>
            )}
          </div>
        </div>
      )}

      {/* Dispute resolution */}
      {challenge.status === "DISPUTED" && challenge.challenger && (
        <>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-neon-red/10 border border-neon-red/30">
            <AlertTriangle size={18} className="text-neon-red shrink-0" />
            <div>
              <p className="text-sm font-semibold text-neon-red">Conflicting results submitted</p>
              <p className="text-xs text-text-muted mt-0.5">
                Host says: <strong>{RESULT_LABEL[challenge.hostResult ?? ""] ?? "not submitted"}</strong> ·
                Challenger says: <strong>{RESULT_LABEL[challenge.challengerResult ?? ""] ?? "not submitted"}</strong>
              </p>
            </div>
          </div>

          {/* Quick contact buttons for both parties */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Contact parties</p>
            <div className="flex flex-wrap gap-2">
              <AdminQuickMessage
                userId={challenge.host.id}
                displayName={challenge.host.displayName ?? challenge.host.username}
                challengeId={id}
                defaultMessage={`Hi, we're reviewing the disputed result for your recent challenge (#${id.slice(-8)}). Please provide any evidence (screenshots) to support your submitted result.`}
              />
              <AdminQuickMessage
                userId={challenge.challenger.id}
                displayName={challenge.challenger.displayName ?? challenge.challenger.username}
                challengeId={id}
                defaultMessage={`Hi, we're reviewing the disputed result for your recent challenge (#${id.slice(-8)}). Please provide any evidence (screenshots) to support your submitted result.`}
              />
            </div>
          </div>

          <ChallengeResolvePanel
            challengeId={id}
            host={challenge.host}
            challenger={challenge.challenger}
          />
        </>
      )}

      {/* Wallet adjustments for both parties */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Wallet Adjustments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminWalletAdjustPanel
            userId={challenge.host.id}
            username={challenge.host.username}
          />
          {challenge.challenger && (
            <AdminWalletAdjustPanel
              userId={challenge.challenger.id}
              username={challenge.challenger.username}
            />
          )}
        </div>
      </div>

      {/* Remove challenge — only show if not already in a terminal state */}
      {!["COMPLETED", "CANCELLED"].includes(challenge.status) && (
        <ChallengeRemovePanel challengeId={id} />
      )}

      {/* Chat log */}
      {challenge.messages.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">Match Chat Log</h2></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
              {challenge.messages.map((m) => (
                <div key={m.id} className="flex gap-2 text-sm">
                  <span className="font-semibold shrink-0 text-text-primary">
                    {m.sender.displayName ?? m.sender.username}:
                  </span>
                  <span className="text-text-subtle break-words">{m.content}</span>
                  <span className="text-xs text-text-muted ml-auto shrink-0">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
