"use client";
import Link from "next/link";
import { MessageCircle, CheckCircle, Clock, Trophy, Home, Plane } from "lucide-react";
import { ResultScreenshotUpload } from "./ResultScreenshotUpload";
import { TournamentMatchSchedule } from "./TournamentMatchSchedule";

interface Player {
  id: string;
  username: string;
  displayName: string | null;
}

interface Props {
  slug: string;
  matchId: string;
  myId: string;
  isPlayer1: boolean;
  opponent: Player | null;
  mySquadSubmitted: boolean;
  opponentSquadSubmitted: boolean;
  myResultKey: string | null;
  opponentResultKey: string | null;
  proposedMatchTime: string | null;
  proposedById: string | null;
  scheduledAt: string | null;
  // home/away
  leg: number | null;
  homeAndAway: boolean;
  // gameweek
  gameweek: number | null;
}

export function MatchPrepCard({
  slug, matchId, myId, isPlayer1, opponent,
  mySquadSubmitted, opponentSquadSubmitted,
  myResultKey, opponentResultKey,
  proposedMatchTime, proposedById, scheduledAt,
  leg, homeAndAway, gameweek,
}: Props) {
  const timeAgreed = !!scheduledAt;
  const squadReady = mySquadSubmitted && opponentSquadSubmitted;
  const resultDone = !!myResultKey;
  const amHome = homeAndAway && leg !== null && ((leg === 1 && isPlayer1) || (leg === 2 && !isPlayer1));

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-surface">
        <div>
          {gameweek && <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">Matchday {gameweek}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="font-semibold text-sm">vs {opponent?.displayName ?? opponent?.username ?? "TBD"}</p>
            {homeAndAway && leg && (
              <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${amHome ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "bg-neon-blue/10 text-neon-blue border border-neon-blue/20"}`}>
                {amHome ? <><Home size={9} /> Home</> : <><Plane size={9} /> Away</>}
              </span>
            )}
          </div>
        </div>
        {resultDone ? (
          <span className="flex items-center gap-1 text-xs text-neon-green font-semibold px-2.5 py-1 rounded-full bg-neon-green/10 border border-neon-green/20">
            <CheckCircle size={11} /> Result submitted
          </span>
        ) : !timeAgreed ? (
          <span className="flex items-center gap-1 text-xs text-yellow-400 font-semibold px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Clock size={11} /> Schedule first
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
        {/* Step 0 — agree on time */}
        <TournamentMatchSchedule
          slug={slug}
          matchId={matchId}
          myId={myId}
          proposedMatchTime={proposedMatchTime}
          proposedById={proposedById}
          scheduledAt={scheduledAt}
          opponentName={opponent?.displayName ?? opponent?.username ?? "opponent"}
        />

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

        {/* Step 1 — chat to share code (only available when time is agreed) */}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${timeAgreed ? "bg-neon-blue/10 border-neon-blue/20" : "bg-bg-surface border-bg-border opacity-50"}`}>
            <MessageCircle size={14} className={timeAgreed ? "text-neon-blue" : "text-text-muted"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Share match code</p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              {timeAgreed ? "Agree on game settings and share your match room code." : "Agree on a time above first, then you can share codes."}
            </p>
            {timeAgreed && opponent ? (
              <Link
                href={`/messages/${opponent.id}`}
                className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-xs font-semibold hover:bg-neon-blue/20 transition-colors"
              >
                <MessageCircle size={12} />
                Message {opponent.displayName ?? opponent.username}
              </Link>
            ) : !timeAgreed ? null : (
              <p className="text-xs text-text-muted mt-1 italic">Opponent not yet assigned.</p>
            )}
          </div>
        </div>

        <div className="border-t border-bg-border" />

        {/* Step 2 — Submit result screenshot */}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${myResultKey ? "bg-neon-green/10 border-neon-green/20" : "bg-bg-surface border-bg-border"}`}>
            <Trophy size={14} className={myResultKey ? "text-neon-green" : "text-text-muted"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Submit match result</p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              After playing, upload a screenshot so the admin can verify and record the result.
            </p>
            <div className="mt-2.5">
              <ResultScreenshotUpload slug={slug} matchId={matchId} currentKey={myResultKey} />
            </div>
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
