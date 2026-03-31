export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Trophy, Calendar } from "lucide-react";
import { TournamentStartButton } from "@/components/admin/TournamentStartButton";
import { TournamentMatchScore } from "@/components/admin/TournamentMatchScore";
import { cn } from "@/lib/utils/cn";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-text-muted/10 text-text-muted border-bg-border",
  REGISTRATION_OPEN: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  COMPLETED: "bg-neon-green/10 text-neon-green border-neon-green/20",
  CANCELLED: "bg-neon-red/10 text-neon-red border-neon-red/20",
};

export default async function AdminTournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

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
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
  });
  if (!tournament) notFound();

  const rounds = Array.from(new Set(tournament.matches.map(m => m.round))).sort((a, b) => a - b);
  const totalRounds = rounds.length;

  function roundLabel(r: number) {
    const remaining = totalRounds - rounds.indexOf(r);
    if (remaining === 1) return "Final";
    if (remaining === 2) return "Semi Final";
    if (remaining === 3) return "Quarter Final";
    return `Round ${r}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tournaments" className="text-text-muted hover:text-text-primary"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", STATUS_COLORS[tournament.status])}>
              {tournament.status.replace(/_/g, " ")}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tournament.type === "KNOCKOUT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-neon-blue/10 text-neon-blue border-neon-blue/20"}`}>
              {tournament.type}
            </span>
          </div>
          <p className="text-text-muted text-sm mt-1">{tournament.game}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/tournaments/${id}/edit`} className="text-xs text-neon-blue hover:underline">Edit</Link>
          {tournament.status === "REGISTRATION_OPEN" && tournament.participants.length >= 2 && (
            <TournamentStartButton tournamentId={id} />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Participants", value: `${tournament.participants.length}/${tournament.maxParticipants}`, icon: Users },
          { label: "Prize Pool", value: `KES ${Number(tournament.prizePool).toLocaleString()}`, icon: Trophy },
          { label: "Entry Fee", value: `KES ${Number(tournament.entryFee).toLocaleString()}`, icon: Trophy },
          { label: "Matches", value: tournament.matches.length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-bg-surface border border-bg-border rounded-xl p-4">
            <p className="text-text-muted text-xs mb-1">{label}</p>
            <p className="font-bold text-lg">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participants */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-bg-border">
            <Users size={15} className="text-neon-blue" />
            <h2 className="font-semibold text-sm">Participants ({tournament.participants.length})</h2>
          </div>
          <div className="divide-y divide-bg-border max-h-80 overflow-y-auto">
            {tournament.participants.length === 0 && <p className="p-4 text-text-muted text-sm">No participants yet.</p>}
            {tournament.participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <span className="text-xs text-text-muted w-5">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-bg-elevated border border-bg-border overflow-hidden shrink-0">
                  {p.user.avatarUrl ? <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">{(p.user.displayName ?? p.user.username)[0]}</div>}
                </div>
                <span className="text-sm">{p.user.displayName ?? p.user.username}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Matches */}
        <div className="lg:col-span-2 bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-bg-border">
            <Trophy size={15} className="text-neon-green" />
            <h2 className="font-semibold text-sm">Matches</h2>
          </div>
          {tournament.matches.length === 0 ? (
            <p className="p-6 text-text-muted text-sm text-center">
              {tournament.status === "REGISTRATION_OPEN" ? "Start the tournament to generate matches." : "No matches yet."}
            </p>
          ) : (
            <div className="divide-y divide-bg-border max-h-[600px] overflow-y-auto">
              {rounds.map(round => (
                <div key={round}>
                  <p className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide bg-bg-elevated">
                    {tournament.type === "KNOCKOUT" ? roundLabel(round) : `Round ${round}`}
                  </p>
                  {tournament.matches.filter(m => m.round === round).map(match => (
                    <div key={match.id} className="p-4">
                      <TournamentMatchScore
                        tournamentId={id}
                        matchId={match.id}
                        player1={match.player1}
                        player2={match.player2}
                        currentP1Score={match.player1Score}
                        currentP2Score={match.player2Score}
                        currentWinnerId={match.winnerId}
                        status={match.status}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
