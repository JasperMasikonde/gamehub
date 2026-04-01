"use client";
import Link from "next/link";
import { MessageCircle, CheckCircle, Clock, Trophy } from "lucide-react";
import { ResultScreenshotUpload } from "./ResultScreenshotUpload";

interface Player {
  id: string;
  username: string;
  displayName: string | null;
}

interface Props {
  slug: string;
  matchId: string;
  opponent: Player | null;
  mySquadSubmitted: boolean;
  opponentSquadSubmitted: boolean;
  myResultKey: string | null;
  opponentResultKey: string | null;
}

export function MatchPrepCard({
  slug,
  matchId,
  opponent,
  mySquadSubmitted,
  opponentSquadSubmitted,
  myResultKey,
  opponentResultKey,
}: Props) {
  const squadReady = mySquadSubmitted && opponentSquadSubmitted;
  const resultDone = !!myResultKey;

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-surface">
        <div>
          <p className="text-xs text-text-muted">Upcoming match</p>
          <p className="font-semibold text-sm mt-0.5">
            vs {opponent?.displayName ?? opponent?.username ?? "TBD"}
          </p>
        </div>
        {resultDone ? (
          <span className="flex items-center gap-1 text-xs text-neon-green font-semibold px-2.5 py-1 rounded-full bg-neon-green/10 border border-neon-green/20">
            <CheckCircle size={11} /> Result submitted
          </span>
        ) : squadReady ? (
          <span className="flex items-center gap-1 text-xs text-neon-blue font-semibold px-2.5 py-1 rounded-full bg-neon-blue/10 border border-neon-blue/20">
            <Clock size={11} /> Ready to play
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-yellow-400 font-semibold px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Clock size={11} /> Pending
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Squad screenshot status */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${mySquadSubmitted ? "border-neon-green/20 bg-neon-green/5 text-neon-green" : "border-yellow-500/20 bg-yellow-500/5 text-yellow-400"}`}>
            {mySquadSubmitted ? <CheckCircle size={11} /> : <Clock size={11} />}
            <span>Your squad {mySquadSubmitted ? "✓" : "pending"}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${opponentSquadSubmitted ? "border-neon-green/20 bg-neon-green/5 text-neon-green" : "border-bg-border bg-bg-surface text-text-muted"}`}>
            {opponentSquadSubmitted ? <CheckCircle size={11} /> : <Clock size={11} />}
            <span>Their squad {opponentSquadSubmitted ? "✓" : "pending"}</span>
          </div>
        </div>

        {/* Step: Chat to share match code */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shrink-0">
            <MessageCircle size={14} className="text-neon-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Chat with your opponent</p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Share your match room code and agree on game settings before you play.
            </p>
            {opponent ? (
              <Link
                href={`/messages/${opponent.id}`}
                className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-xs font-semibold hover:bg-neon-blue/20 transition-colors"
              >
                <MessageCircle size={12} />
                Message {opponent.displayName ?? opponent.username}
              </Link>
            ) : (
              <p className="text-xs text-text-muted mt-1 italic">Opponent not yet assigned.</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-bg-border" />

        {/* Step: Submit result screenshot */}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${myResultKey ? "bg-neon-green/10 border-neon-green/20" : "bg-bg-surface border-bg-border"}`}>
            <Trophy size={14} className={myResultKey ? "text-neon-green" : "text-text-muted"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Submit match result</p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              After you&apos;ve played, upload a screenshot of the final score screen so the admin can verify and record the result.
            </p>
            <div className="mt-2.5">
              <ResultScreenshotUpload slug={slug} matchId={matchId} currentKey={myResultKey} />
            </div>

            {/* Opponent result status */}
            <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-xl border text-xs ${opponentResultKey ? "border-neon-green/20 bg-neon-green/5 text-neon-green" : "border-bg-border bg-bg-surface text-text-muted"}`}>
              {opponentResultKey ? <CheckCircle size={10} /> : <Clock size={10} />}
              Opponent result: {opponentResultKey ? "submitted ✓" : "not yet submitted"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
