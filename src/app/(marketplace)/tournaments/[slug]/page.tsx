export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Calendar, Info } from "lucide-react";
import { KnockoutBracket } from "@/components/tournament/KnockoutBracket";
import { LeagueStandings } from "@/components/tournament/LeagueStandings";
import { RegisterButton } from "@/components/tournament/RegisterButton";
import { cn } from "@/lib/utils/cn";

const STATUS_COLORS: Record<string, string> = {
  REGISTRATION_OPEN: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  COMPLETED: "bg-neon-green/10 text-neon-green border-neon-green/20",
  CANCELLED: "bg-neon-red/10 text-neon-red border-neon-red/20",
};

export default async function TournamentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
  });
  if (!tournament || tournament.status === "DRAFT") notFound();

  const isRegistered = session?.user ? tournament.participants.some(p => p.userId === session.user.id) : false;
  const isFull = tournament.participants.length >= tournament.maxParticipants;
  const isOpen = tournament.status === "REGISTRATION_OPEN";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/tournaments" className="text-text-muted hover:text-text-primary mt-1"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-black">{tournament.name}</h1>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", STATUS_COLORS[tournament.status] ?? "")}>
              {tournament.status.replace(/_/g, " ")}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tournament.type === "KNOCKOUT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-neon-blue/10 text-neon-blue border-neon-blue/20"}`}>
              {tournament.type === "KNOCKOUT" ? "Knockout" : "League"}
            </span>
          </div>
          <p className="text-text-muted">{tournament.game}</p>
        </div>
        <RegisterButton slug={slug} isRegistered={isRegistered} isOpen={isOpen} isFull={isFull} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Players", value: `${tournament.participants.length}/${tournament.maxParticipants}`, icon: Users },
          { label: "Prize Pool", value: Number(tournament.prizePool) > 0 ? `KES ${Number(tournament.prizePool).toLocaleString()}` : "—", icon: Trophy },
          { label: "Entry Fee", value: Number(tournament.entryFee) > 0 ? `KES ${Number(tournament.entryFee).toLocaleString()}` : "Free", icon: Trophy },
          { label: "Start Date", value: tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : "TBD", icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-bg-surface border border-bg-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className="text-text-muted" /><p className="text-text-muted text-xs">{label}</p></div>
            <p className="font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Bracket / Standings */}
          <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-bg-border flex items-center gap-2">
              <Trophy size={15} className={tournament.type === "KNOCKOUT" ? "text-purple-400" : "text-neon-blue"} />
              <h2 className="font-semibold text-sm">{tournament.type === "KNOCKOUT" ? "Bracket" : "Standings"}</h2>
            </div>
            <div className="p-4">
              {tournament.type === "KNOCKOUT"
                ? <KnockoutBracket matches={tournament.matches} />
                : <LeagueStandings participants={tournament.participants} matches={tournament.matches} />
              }
            </div>
          </div>

          {/* Match list (league) */}
          {tournament.type === "LEAGUE" && tournament.matches.length > 0 && (
            <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-bg-border"><h2 className="font-semibold text-sm">Fixtures & Results</h2></div>
              <div className="divide-y divide-bg-border">
                {tournament.matches.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className={cn("truncate max-w-[140px]", m.winnerId === m.player1?.id ? "text-neon-green font-semibold" : "text-text-muted")}>{m.player1?.displayName ?? m.player1?.username ?? "TBD"}</span>
                    <span className="text-text-muted mx-2 font-mono">
                      {m.status === "COMPLETED" ? `${m.player1Score} – ${m.player2Score}` : "vs"}
                    </span>
                    <span className={cn("truncate max-w-[140px] text-right", m.winnerId === m.player2?.id ? "text-neon-green font-semibold" : "text-text-muted")}>{m.player2?.displayName ?? m.player2?.username ?? "TBD"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Participants */}
          <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-bg-border flex items-center gap-2"><Users size={14} className="text-neon-blue" /><h2 className="font-semibold text-sm">Participants</h2></div>
            <div className="divide-y divide-bg-border max-h-64 overflow-y-auto">
              {tournament.participants.length === 0 && <p className="p-4 text-text-muted text-sm">Be the first to register!</p>}
              {tournament.participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-text-muted w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-bg-elevated border border-bg-border overflow-hidden shrink-0">
                    {p.user.avatarUrl ? <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">{(p.user.displayName ?? p.user.username)[0]}</div>}
                  </div>
                  <span className="text-sm truncate">{p.user.displayName ?? p.user.username}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {tournament.description && (
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><Info size={13} className="text-text-muted" /><h2 className="font-semibold text-sm">About</h2></div>
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">{tournament.description}</p>
            </div>
          )}

          {/* Rules */}
          {tournament.rules && (
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-4">
              <h2 className="font-semibold text-sm mb-2">Rules</h2>
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">{tournament.rules}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
