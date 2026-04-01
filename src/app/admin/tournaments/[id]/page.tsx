export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Trophy, Calendar } from "lucide-react";
import { TournamentStartButton } from "@/components/admin/TournamentStartButton";
import { TournamentMatchScore } from "@/components/admin/TournamentMatchScore";
import { TournamentStatusSelect } from "@/components/admin/TournamentStatusSelect";
import { AdminAddParticipant } from "@/components/admin/AdminAddParticipant";
import { RealtimeRefresh } from "@/components/escrow/RealtimeRefresh";

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

  // userId -> participant data
  const squadMap = new Map(tournament.participants.map(p => [p.userId, p.squadScreenshotKey ?? null]));
  const teamNameMap = new Map(tournament.participants.map(p => [p.userId, p.teamName ?? null]));

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
      <RealtimeRefresh events={["tournament_update"]} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/tournaments" className="text-text-muted hover:text-text-primary"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <TournamentStatusSelect tournamentId={id} currentStatus={tournament.status} />
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
        {/* Participants panel with add/remove */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-bg-border">
            <Users size={15} className="text-neon-blue" />
            <h2 className="font-semibold text-sm">Participants ({tournament.participants.length}/{tournament.maxParticipants})</h2>
          </div>
          <div className="p-4">
            <AdminAddParticipant
              tournamentId={id}
              participants={tournament.participants}
              status={tournament.status}
            />
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
              {tournament.status === "REGISTRATION_OPEN"
                ? "Add at least 2 participants and click Start Tournament to generate matches."
                : "No matches yet."}
            </p>
          ) : (
            <div className="divide-y divide-bg-border max-h-[600px] overflow-y-auto">
              {rounds.map(round => (
                <div key={round}>
                  <p className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide bg-bg-elevated">
                    {tournament.type === "KNOCKOUT" ? roundLabel(round) : `Round ${round}`}
                  </p>
                  {tournament.matches.filter(m => m.round === round).map(match => (
                    <div key={match.id} className="p-4 border-b border-bg-border last:border-0">
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
