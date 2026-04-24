export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Trophy, Calendar, ChevronRight, Layers } from "lucide-react";
import { TournamentStartButton } from "@/components/admin/TournamentStartButton";
import { TournamentMatchScore } from "@/components/admin/TournamentMatchScore";
import { TournamentStatusSelect } from "@/components/admin/TournamentStatusSelect";
import { AdminAddParticipant } from "@/components/admin/AdminAddParticipant";
import { AdvanceGameweekButton } from "@/components/admin/AdvanceGameweekButton";
import { AdvancePhaseButton } from "@/components/admin/AdvancePhaseButton";
import { RealtimeRefresh } from "@/components/escrow/RealtimeRefresh";
import { cn } from "@/lib/utils/cn";

const TYPE_LABEL: Record<string, string> = {
  KNOCKOUT: "Knockout",
  LEAGUE: "League",
  CHAMPIONS_LEAGUE: "Champions League",
};

const TYPE_COLOR: Record<string, string> = {
  KNOCKOUT: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  LEAGUE: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
  CHAMPIONS_LEAGUE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default async function AdminTournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gw?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { gw } = await searchParams;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
      matches: {
        include: {
          player1: { select: { id: true, username: true, displayName: true } },
          player2: { select: { id: true, username: true, displayName: true } },
        },
        orderBy: [{ gameweek: "asc" }, { round: "asc" }, { matchNumber: "asc" }],
      },
      groups: { orderBy: { order: "asc" } },
    },
  });
  if (!tournament) notFound();

  const squadMap = new Map(tournament.participants.map(p => [p.userId, p.squadScreenshotKey ?? null]));
  const teamNameMap = new Map(tournament.participants.map(p => [p.userId, p.teamName ?? null]));

  const isCL = tournament.type === "CHAMPIONS_LEAGUE";
  const isKnockout = tournament.type === "KNOCKOUT";
  const hasGameweeks = tournament.matches.some(m => m.gameweek !== null);

  // Determine matches to show
  const gameweeks = Array.from(new Set(tournament.matches.map(m => m.gameweek).filter(Boolean))).sort((a, b) => (a ?? 0) - (b ?? 0)) as number[];
  const selectedGw = gw ? Number(gw) : (tournament.currentGameweek || gameweeks[0] || null);

  const displayedMatches = hasGameweeks && selectedGw !== null
    ? tournament.matches.filter(m => m.gameweek === selectedGw)
    : tournament.matches;

  // Knockout: label by remaining rounds
  const rounds = Array.from(new Set(displayedMatches.map(m => m.round))).sort((a, b) => a - b);
  const totalRounds = Array.from(new Set(tournament.matches.map(m => m.round))).length;

  function roundLabel(r: number) {
    const remaining = totalRounds - rounds.indexOf(r);
    if (!hasGameweeks) {
      if (remaining === 1) return "Final";
      if (remaining === 2) return "Semi Final";
      if (remaining === 3) return "Quarter Final";
    }
    return `Round ${r}`;
  }

  // Stats
  const completedCount = tournament.matches.filter(m => m.status === "COMPLETED" || m.status === "WALKOVER").length;
  const totalMatches = tournament.matches.length;

  return (
    <div className="space-y-6">
      <RealtimeRefresh events={["tournament_update"]} />

      {/* ── Header ── */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/admin/tournaments" className="text-text-muted hover:text-text-primary mt-1"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold truncate">{tournament.name}</h1>
            <TournamentStatusSelect tournamentId={id} currentStatus={tournament.status} />
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", TYPE_COLOR[tournament.type] ?? "")}>
              {TYPE_LABEL[tournament.type] ?? tournament.type}
            </span>
            {isCL && tournament.phase && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-bg-elevated text-text-muted border-bg-border">
                {tournament.phase === "GROUP" ? "Group Phase" : "Knockout Phase"}
              </span>
            )}
            {tournament.homeAndAway && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted border border-bg-border">H&A</span>
            )}
          </div>
          <p className="text-text-muted text-sm">{tournament.game}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/admin/tournaments/${id}/edit`} className="text-xs text-neon-blue hover:underline">Edit</Link>
          <Link href={`/tournaments/${tournament.slug}`} target="_blank" className="text-xs text-text-muted hover:text-text-primary">↗ View public page</Link>
          {tournament.status === "REGISTRATION_OPEN" && tournament.participants.length >= 2 && (
            <TournamentStartButton tournamentId={id} />
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Participants", value: `${tournament.participants.length}/${tournament.maxParticipants}`, icon: Users },
          { label: "Prize Pool", value: `KES ${Number(tournament.prizePool).toLocaleString()}`, icon: Trophy },
          { label: "Matches", value: `${completedCount}/${totalMatches} done`, icon: Calendar },
          { label: "Progress", value: totalMatches > 0 ? `${Math.round((completedCount / totalMatches) * 100)}%` : "0%", icon: ChevronRight },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-bg-surface border border-bg-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0"><Icon size={14} className="text-text-muted" /></div>
            <div className="min-w-0"><p className="text-text-muted text-xs">{label}</p><p className="font-bold text-sm truncate">{value}</p></div>
          </div>
        ))}
      </div>

      {/* ── Gameweek controls ── */}
      {tournament.status === "IN_PROGRESS" && hasGameweeks && (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-neon-blue" />
            <span className="text-sm font-semibold">Matchday Control</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {gameweeks.map(gwNum => (
              <Link
                key={gwNum}
                href={`/admin/tournaments/${id}?gw=${gwNum}`}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold border transition-colors",
                  selectedGw === gwNum
                    ? "bg-neon-blue/20 text-neon-blue border-neon-blue/30"
                    : gwNum < (tournament.currentGameweek || 0)
                    ? "bg-neon-green/10 text-neon-green border-neon-green/20"
                    : gwNum === tournament.currentGameweek
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    : "bg-bg-elevated text-text-muted border-bg-border opacity-60"
                )}
              >
                GW{gwNum}
                {gwNum === tournament.currentGameweek && " ●"}
              </Link>
            ))}
          </div>
          <div className="ml-auto">
            <AdvanceGameweekButton tournamentId={id} currentGameweek={tournament.currentGameweek} />
          </div>
        </div>
      )}

      {/* ── CL phase advance ── */}
      {isCL && tournament.status === "IN_PROGRESS" && tournament.phase === "GROUP" && (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Champions League Group Phase</p>
            <p className="text-xs text-text-muted mt-0.5">When all group matches are done, advance to the knockout phase.</p>
          </div>
          <AdvancePhaseButton tournamentId={id} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Participants panel ── */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-bg-border">
            <Users size={15} className="text-neon-blue" />
            <h2 className="font-semibold text-sm">Participants ({tournament.participants.length}/{tournament.maxParticipants})</h2>
          </div>
          <div className="p-4">
            <AdminAddParticipant tournamentId={id} participants={tournament.participants} status={tournament.status} />
          </div>
        </div>

        {/* ── Matches panel ── */}
        <div className="lg:col-span-2 bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-bg-border">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-neon-green" />
              <h2 className="font-semibold text-sm">
                {hasGameweeks && selectedGw ? `Matchday ${selectedGw} — ` : ""}Matches
              </h2>
            </div>
            {hasGameweeks && selectedGw && (
              <span className="text-xs text-text-muted">
                {displayedMatches.filter(m => m.status === "COMPLETED" || m.status === "WALKOVER").length}/{displayedMatches.length} done
              </span>
            )}
          </div>

          {tournament.matches.length === 0 ? (
            <p className="p-6 text-text-muted text-sm text-center">
              {tournament.status === "REGISTRATION_OPEN"
                ? "Add at least 2 participants and click Start Tournament to generate matches."
                : "No matches yet."}
            </p>
          ) : displayedMatches.length === 0 ? (
            <p className="p-6 text-text-muted text-sm text-center">No matches in this matchday.</p>
          ) : (
            <div className="divide-y divide-bg-border overflow-y-auto" style={{ maxHeight: 700 }}>
              {(isKnockout ? rounds : [null]).map(round => {
                const roundMatches = round !== null ? displayedMatches.filter(m => m.round === round) : displayedMatches;
                if (roundMatches.length === 0) return null;
                return (
                  <div key={round ?? "all"}>
                    {round !== null && (
                      <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide bg-bg-elevated border-b border-bg-border">
                        {isKnockout ? roundLabel(round) : `Round ${round}`}
                      </div>
                    )}
                    {roundMatches.map(match => {
                      // Find group name for CL
                      const groupName = isCL ? tournament.groups.find(g => g.id === match.groupId)?.name : null;
                      return (
                        <div key={match.id} className="p-4 border-b border-bg-border last:border-0">
                          {(groupName || match.leg) && (
                            <div className="flex items-center gap-2 mb-2">
                              {groupName && <span className="text-[10px] border border-bg-border text-text-muted rounded px-1.5 py-0.5">{groupName}</span>}
                              {match.leg && tournament.homeAndAway && (
                                <span className="text-[10px] border border-bg-border text-text-muted rounded px-1.5 py-0.5">Leg {match.leg}</span>
                              )}
                            </div>
                          )}
                          <TournamentMatchScore
                            tournamentId={id}
                            matchId={match.id}
                            player1={match.player1}
                            player2={match.player2}
                            currentP1Score={match.player1Score}
                            currentP2Score={match.player2Score}
                            currentWinnerId={match.winnerId}
                            status={match.status}
                            player1SquadKey={match.player1Id ? squadMap.get(match.player1Id) ?? null : null}
                            player2SquadKey={match.player2Id ? squadMap.get(match.player2Id) ?? null : null}
                            player1TeamName={match.player1Id ? teamNameMap.get(match.player1Id) ?? null : null}
                            player2TeamName={match.player2Id ? teamNameMap.get(match.player2Id) ?? null : null}
                            player1ResultKey={match.player1ResultKey}
                            player2ResultKey={match.player2ResultKey}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
