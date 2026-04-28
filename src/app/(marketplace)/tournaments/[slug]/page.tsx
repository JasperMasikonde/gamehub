export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Calendar, Info, MessageSquare, LayoutGrid, Shield, Lock } from "lucide-react";
import { KnockoutBracket } from "@/components/tournament/KnockoutBracket";
import { LeagueStandings } from "@/components/tournament/LeagueStandings";
import { CLGroupStandings } from "@/components/tournament/CLGroupStandings";
import { RegisterButton } from "@/components/tournament/RegisterButton";
import { TournamentRealtimeRefresh } from "@/components/tournament/TournamentRealtimeRefresh";
import { MatchPrepCard } from "@/components/tournament/MatchPrepCard";
import { SquadScreenshotUpload } from "@/components/tournament/SquadScreenshotUpload";
import { TournamentGroupChat } from "@/components/tournament/TournamentGroupChat";
import { cn } from "@/lib/utils/cn";

const STATUS_COLORS: Record<string, string> = {
  REGISTRATION_OPEN: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  COMPLETED: "bg-neon-green/10 text-neon-green border-neon-green/20",
  CANCELLED: "bg-neon-red/10 text-neon-red border-neon-red/20",
  DRAFT: "bg-bg-elevated text-text-muted border-bg-border",
};

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

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "overview" } = await searchParams;
  const session = await auth();

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
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
      groups: {
        include: {
          participants: {
            include: { user: { select: { id: true, username: true, displayName: true } } },
          },
          matches: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!tournament || tournament.status === "DRAFT") notFound();

  const squadMap = new Map(tournament.participants.map(p => [p.userId, p.squadScreenshotKey ?? null]));
  const userId = session?.user?.id ?? null;
  const myParticipant = userId ? tournament.participants.find(p => p.userId === userId) : null;
  const isRegistered = !!myParticipant;
  const isFull = tournament.participants.length >= tournament.maxParticipants;
  const isOpen = tournament.status === "REGISTRATION_OPEN";
  const isLive = tournament.status === "IN_PROGRESS";

  // My pending matches — only the currently open matchday (admin-gated).
  // Knockout matches have no gameweek, so they are always shown when pending.
  // League/CL matches are hidden until the admin opens that matchday (currentGameweek > 0).
  const allMyPendingMatches = isLive && userId
    ? tournament.matches.filter(m => {
        if (m.status === "COMPLETED" || m.status === "WALKOVER") return false;
        if (m.player1Id !== userId && m.player2Id !== userId) return false;
        if (m.gameweek !== null) {
          return tournament.currentGameweek > 0 && m.gameweek === tournament.currentGameweek;
        }
        return true;
      })
    : [];

  // For home & away tournaments, show only one card per tie (leg 1).
  // The leg 2 result upload is handled inside the leg 1 card.
  const myPendingMatches = tournament.homeAndAway
    ? allMyPendingMatches.filter(m => m.leg !== 2)
    : allMyPendingMatches;

  // Map each leg 1 match to its leg 2 companion (for result upload)
  const companionMap = new Map<string, typeof tournament.matches[0]>();
  if (tournament.homeAndAway) {
    for (const m of myPendingMatches) {
      if (m.leg === 1) {
        const companion = tournament.matches.find(c =>
          c.leg === 2 &&
          c.player1Id === m.player2Id &&
          c.player2Id === m.player1Id
        );
        if (companion) companionMap.set(m.id, companion);
      }
    }
  }

  // Fetch group chat messages (only for registered participants)
  let chatMessages: {
    id: string; senderId: string; content: string; imageUrl: string | null; createdAt: string;
    sender: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  }[] = [];
  if (isRegistered && userId) {
    const msgs = await prisma.tournamentMessage.findMany({
      where: { tournamentId: tournament.id },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    chatMessages = msgs.map(m => ({ ...m, imageUrl: m.imageUrl, createdAt: m.createdAt.toISOString() }));
  }

  const isCL = tournament.type === "CHAMPIONS_LEAGUE";
  const isKnockout = tournament.type === "KNOCKOUT";
  const isLeague = tournament.type === "LEAGUE";
  const inGroupPhase = isCL && tournament.phase === "GROUP";
  const inKnockoutPhase = isCL && tournament.phase === "KNOCKOUT";

  // Fixtures grouped by gameweek
  const gameweeks = Array.from(new Set(tournament.matches.map(m => m.gameweek).filter(Boolean))).sort((a, b) => (a ?? 0) - (b ?? 0)) as number[];
  const knockoutMatches = isCL && inKnockoutPhase
    ? tournament.matches.filter(m => !m.groupId)
    : tournament.matches;

  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "fixtures", label: isKnockout ? "Bracket" : "Fixtures", icon: Trophy },
    ...(isRegistered ? [{ key: "chat", label: "Group Chat", icon: MessageSquare }] : []),
    { key: "info", label: "Info", icon: Info },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <TournamentRealtimeRefresh slug={slug} />

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Link href="/tournaments" className="text-text-muted hover:text-text-primary mt-1.5"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", STATUS_COLORS[tournament.status] ?? "")}>
              {tournament.status.replace(/_/g, " ")}
            </span>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", TYPE_COLOR[tournament.type] ?? "")}>
              {TYPE_LABEL[tournament.type] ?? tournament.type}
            </span>
            {isCL && tournament.phase && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-bg-elevated text-text-muted border-bg-border">
                {tournament.phase === "GROUP" ? "Group Phase" : "Knockout Phase"}
              </span>
            )}
            {tournament.homeAndAway && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-bg-elevated text-text-muted border-bg-border">
                Home & Away
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary truncate">{tournament.name}</h1>
          <p className="text-text-muted text-sm mt-0.5">{tournament.game}</p>
        </div>
        <RegisterButton slug={slug} tournamentId={tournament.id} entryFee={Number(tournament.entryFee)} isRegistered={isRegistered} isOpen={isOpen} isFull={isFull} />
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Players", value: `${tournament.participants.length}/${tournament.maxParticipants}`, icon: Users },
          { label: "Prize Pool", value: Number(tournament.prizePool) > 0 ? `KES ${Number(tournament.prizePool).toLocaleString()}` : "—", icon: Trophy },
          { label: "Entry", value: Number(tournament.entryFee) > 0 ? `KES ${Number(tournament.entryFee).toLocaleString()}` : "Free", icon: Shield },
          { label: "Starts", value: tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "TBD", icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-bg-surface border border-bg-border rounded-xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
              <Icon size={14} className="text-text-muted" />
            </div>
            <div className="min-w-0">
              <p className="text-text-muted text-xs">{label}</p>
              <p className="font-bold text-sm truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gameweek banner (if in progress and has gameweeks) ── */}
      {isLive && tournament.currentGameweek > 0 && (
        <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
          <p className="text-sm text-yellow-400 font-semibold">
            Matchday {tournament.currentGameweek} is live
          </p>
          {isCL && inGroupPhase && (
            <span className="text-xs text-text-muted">· Group Phase</span>
          )}
        </div>
      )}

      {/* ── Squad + team name (registered, as soon as open or live) ── */}
      {isRegistered && (isOpen || isLive) && myParticipant && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Shield size={13} className="text-neon-blue" />
            Submit Your Squad & Team Name
          </h2>
          <SquadScreenshotUpload slug={slug} currentKey={myParticipant.squadScreenshotKey ?? null} currentTeamName={myParticipant.teamName ?? null} />
        </div>
      )}

      {/* ── Waiting for matchday banner (league/CL, live but no matchday open yet) ── */}
      {isRegistered && isLive && !isKnockout && tournament.currentGameweek === 0 && (
        <div className="flex items-center gap-3 bg-bg-surface border border-bg-border rounded-2xl px-5 py-4">
          <div className="w-8 h-8 rounded-xl bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
            <Trophy size={15} className="text-text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold">Waiting for Matchday 1</p>
            <p className="text-xs text-text-muted mt-0.5">The admin will open the first matchday soon. You&apos;ll see your fixtures and be able to contact your opponent once it&apos;s live.</p>
          </div>
        </div>
      )}

      {/* ── My pending matches ── */}
      {myPendingMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            {tournament.currentGameweek > 0
              ? `Matchday ${tournament.currentGameweek} — Your match${myPendingMatches.length > 1 ? "es" : ""}`
              : `Your upcoming match${myPendingMatches.length > 1 ? "es" : ""}`}
          </h2>
          {myPendingMatches.map(m => {
            const isMe1 = m.player1Id === userId;
            const opponent = isMe1 ? m.player2 : m.player1;
            const myResultKey = isMe1 ? m.player1ResultKey : m.player2ResultKey;
            const opponentResultKey = isMe1 ? m.player2ResultKey : m.player1ResultKey;
            const opponentId = isMe1 ? m.player2Id : m.player1Id;

            // Companion leg 2: in DB, leg2.player1 = original player2, leg2.player2 = original player1
            const companion = companionMap.get(m.id) ?? null;
            const awayLegMatchId = companion?.id ?? null;
            const awayLegMyResultKey = companion
              ? (isMe1 ? companion.player2ResultKey : companion.player1ResultKey)
              : null;
            const awayLegOpponentResultKey = companion
              ? (isMe1 ? companion.player1ResultKey : companion.player2ResultKey)
              : null;

            return (
              <MatchPrepCard
                key={m.id}
                slug={slug}
                matchId={m.id}
                myId={userId!}
                isPlayer1={isMe1}
                opponent={opponent}
                mySquadSubmitted={!!myParticipant?.squadScreenshotKey}
                opponentSquadSubmitted={!!(opponentId && squadMap.get(opponentId))}
                myResultKey={myResultKey}
                opponentResultKey={opponentResultKey}
                proposedMatchTime={m.proposedMatchTime?.toISOString() ?? null}
                proposedById={m.proposedById}
                scheduledAt={m.scheduledAt?.toISOString() ?? null}
                leg={m.leg}
                homeAndAway={tournament.homeAndAway}
                awayLegMatchId={awayLegMatchId}
                awayLegMyResultKey={awayLegMyResultKey}
                awayLegOpponentResultKey={awayLegOpponentResultKey}
                gameweek={m.gameweek}
                gameweekDeadline={tournament.gameweekDeadline?.toISOString() ?? null}
              />
            );
          })}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="border-b border-bg-border flex gap-0 overflow-x-auto">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/tournaments/${slug}?tab=${t.key}`}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              tab === t.key
                ? "border-neon-blue text-neon-blue"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            <t.icon size={13} />
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* CL group standings */}
            {isCL && inGroupPhase && tournament.groups.length > 0 && (
              <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-bg-border flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-400" />
                  <h2 className="font-semibold text-sm">Group Standings</h2>
                </div>
                <div className="p-4">
                  <CLGroupStandings
                    groups={tournament.groups.map(g => ({
                      ...g,
                      participants: g.participants.map(p => ({
                        userId: p.userId,
                        user: p.user,
                      })),
                      matches: g.matches,
                    }))}
                    groupsAdvance={tournament.groupsAdvance ?? 2}
                  />
                </div>
              </div>
            )}

            {/* CL knockout phase bracket */}
            {isCL && inKnockoutPhase && (
              <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-bg-border flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-400" />
                  <h2 className="font-semibold text-sm">Knockout Phase</h2>
                </div>
                <div className="p-4">
                  <KnockoutBracket matches={knockoutMatches.filter(m => !m.groupId)} />
                </div>
              </div>
            )}

            {/* Pure knockout */}
            {isKnockout && (
              <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-bg-border flex items-center gap-2">
                  <Trophy size={14} className="text-purple-400" />
                  <h2 className="font-semibold text-sm">Bracket</h2>
                </div>
                <div className="p-4">
                  <KnockoutBracket matches={tournament.matches} />
                </div>
              </div>
            )}

            {/* League standings */}
            {isLeague && (
              <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-bg-border flex items-center gap-2">
                  <Trophy size={14} className="text-neon-blue" />
                  <h2 className="font-semibold text-sm">Standings</h2>
                </div>
                <div className="p-4">
                  <LeagueStandings participants={tournament.participants} matches={tournament.matches} />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Participants */}
            <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-bg-border flex items-center gap-2">
                <Users size={14} className="text-neon-blue" />
                <h2 className="font-semibold text-sm">Players ({tournament.participants.length}/{tournament.maxParticipants})</h2>
              </div>
              <div className="divide-y divide-bg-border max-h-72 overflow-y-auto">
                {tournament.participants.length === 0 && <p className="p-4 text-text-muted text-sm">Be the first to register!</p>}
                {tournament.participants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-text-muted w-5 shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-bg-elevated border border-bg-border overflow-hidden shrink-0 flex items-center justify-center text-xs text-text-muted">
                      {p.user.avatarUrl
                        ? <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : (p.user.displayName ?? p.user.username)[0]}
                    </div>
                    <span className="text-sm truncate flex-1">{p.user.displayName ?? p.user.username}</span>
                    {isLive && p.squadScreenshotKey && <span className="text-[10px] text-neon-green" title="Squad verified">✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Public description short */}
            {tournament.description && (
              <div className="bg-bg-surface border border-bg-border rounded-2xl p-4">
                <h2 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Info size={12} className="text-text-muted" /> About</h2>
                <p className="text-sm text-text-muted leading-relaxed line-clamp-6 whitespace-pre-line">{tournament.description}</p>
                {tournament.description.length > 200 && (
                  <Link href={`/tournaments/${slug}?tab=info`} className="text-xs text-neon-blue hover:underline mt-1 block">Read more</Link>
                )}
              </div>
            )}

            {/* Private description — registered participants only */}
            {tournament.privateDescription && isRegistered ? (
              <div className="bg-neon-purple/5 border border-neon-purple/25 rounded-2xl p-4">
                <h2 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <Lock size={12} className="text-neon-purple" />
                  <span className="text-neon-purple">Members Info</span>
                </h2>
                <p className="text-sm text-text-muted leading-relaxed line-clamp-6 whitespace-pre-line">{tournament.privateDescription}</p>
                {tournament.privateDescription.length > 200 && (
                  <Link href={`/tournaments/${slug}?tab=info`} className="text-xs text-neon-purple hover:underline mt-1 block">Read more</Link>
                )}
              </div>
            ) : tournament.privateDescription && !isRegistered ? (
              <div className="bg-bg-surface border border-bg-border rounded-2xl p-4">
                <div className="flex items-center gap-2 text-text-muted">
                  <Lock size={13} />
                  <p className="text-sm font-medium">Members-only info</p>
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  {isOpen
                    ? "Register to unlock entry instructions, links, and more."
                    : "Only visible to registered participants."}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Tab: Fixtures / Bracket ── */}
      {tab === "fixtures" && (
        <div className="space-y-4">
          {isKnockout && <KnockoutBracket matches={tournament.matches} />}
          {isCL && inKnockoutPhase && <KnockoutBracket matches={tournament.matches.filter(m => !m.groupId)} />}

          {(isLeague || (isCL && inGroupPhase)) && (
            <>
              {/* Only show gameweeks the admin has opened (≤ currentGameweek) */}
              {tournament.currentGameweek === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">
                  Fixtures will be published when the admin opens Matchday 1.
                </div>
              ) : (
                gameweeks
                  .filter(gw => gw <= tournament.currentGameweek)
                  .map(gw => {
                    const gwMatches = tournament.matches.filter(m => m.gameweek === gw);
                    const isCurrentGw = gw === tournament.currentGameweek;
                    const isPastGw = gw < tournament.currentGameweek;
                    return (
                      <div key={gw} className={cn("bg-bg-surface border rounded-2xl overflow-hidden", isCurrentGw ? "border-yellow-500/30" : "border-bg-border")}>
                        <div className={cn("px-4 py-3 border-b flex items-center justify-between", isCurrentGw ? "border-yellow-500/20 bg-yellow-500/5" : "border-bg-border")}>
                          <div className="flex items-center gap-2">
                            {isCurrentGw && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                            <h3 className={cn("text-sm font-semibold", isCurrentGw ? "text-yellow-400" : "text-text-primary")}>Matchday {gw}</h3>
                          </div>
                          <span className="text-xs text-text-muted">
                            {isCurrentGw ? "Live" : isPastGw ? "Completed" : ""}
                          </span>
                        </div>
                        <div className="divide-y divide-bg-border">
                          {gwMatches.map(m => {
                            const groupName = isCL ? tournament.groups.find(g => g.id === m.groupId)?.name : null;
                            return (
                              <div key={m.id} className="flex items-center px-4 py-3 gap-2 text-sm">
                                {groupName && <span className="text-[10px] text-text-muted border border-bg-border rounded px-1.5 py-0.5 shrink-0">{groupName}</span>}
                                {m.leg && <span className="text-[10px] text-text-muted shrink-0">L{m.leg}</span>}
                                <span className={cn("flex-1 truncate text-right", m.winnerId === m.player1?.id ? "text-neon-green font-semibold" : "text-text-muted")}>
                                  {m.player1?.displayName ?? m.player1?.username ?? "TBD"}
                                </span>
                                <span className="font-mono text-text-muted mx-1 shrink-0 min-w-[40px] text-center">
                                  {m.status === "COMPLETED" ? `${m.player1Score ?? 0}–${m.player2Score ?? 0}` : "vs"}
                                </span>
                                <span className={cn("flex-1 truncate", m.winnerId === m.player2?.id ? "text-neon-green font-semibold" : "text-text-muted")}>
                                  {m.player2?.displayName ?? m.player2?.username ?? "TBD"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Group Chat ── */}
      {tab === "chat" && isRegistered && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-bg-border flex items-center gap-2">
            <MessageSquare size={14} className="text-neon-green" />
            <h2 className="font-semibold text-sm">{tournament.name} · Group Chat</h2>
            <span className="ml-auto text-xs text-text-muted">{tournament.participants.length} members</span>
          </div>
          <TournamentGroupChat slug={slug} initialMessages={chatMessages} />
        </div>
      )}

      {/* ── Tab: Info ── */}
      {tab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          {tournament.description && (
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Info size={13} className="text-text-muted" /> About</h2>
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">{tournament.description}</p>
            </div>
          )}
          {tournament.rules && (
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Shield size={13} className="text-text-muted" /> Rules</h2>
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">{tournament.rules}</p>
            </div>
          )}

          {/* Private description */}
          {tournament.privateDescription && (
            isRegistered ? (
              <div className="bg-neon-purple/5 border border-neon-purple/25 rounded-2xl p-5 lg:col-span-2">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Lock size={13} className="text-neon-purple" />
                  <span className="text-neon-purple">Members Info</span>
                  <span className="ml-auto text-[10px] text-neon-purple font-semibold bg-neon-purple/10 border border-neon-purple/20 px-2 py-0.5 rounded-full">Registered players only</span>
                </h2>
                <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">{tournament.privateDescription}</p>
              </div>
            ) : (
              <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 lg:col-span-2 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
                  <Lock size={16} className="text-text-muted" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Members-only information</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {isOpen
                      ? "Register to unlock entry instructions, links, and exclusive tournament details."
                      : "This information is only visible to registered participants."}
                  </p>
                </div>
                {isOpen && !isFull && (
                  <div className="ml-auto shrink-0">
                    <Link href={`/tournaments/${slug}`} className="text-xs text-neon-green font-semibold hover:underline">Register →</Link>
                  </div>
                )}
              </div>
            )
          )}

          <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 lg:col-span-2">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Users size={13} className="text-text-muted" /> All Participants</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {tournament.participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-xl bg-bg-elevated border border-bg-border">
                  <div className="w-7 h-7 rounded-full bg-bg-surface border border-bg-border overflow-hidden flex items-center justify-center text-xs text-text-muted shrink-0">
                    {p.user.avatarUrl ? <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : (p.user.displayName ?? p.user.username)[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.user.displayName ?? p.user.username}</p>
                    {isLive && p.squadScreenshotKey && <p className="text-[9px] text-neon-green">✓ Squad</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
