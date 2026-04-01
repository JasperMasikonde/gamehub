export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Trophy, Users, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { RealtimeRefresh } from "@/components/escrow/RealtimeRefresh";

const STATUS_COLORS: Record<string, string> = {
  REGISTRATION_OPEN: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  COMPLETED: "bg-neon-green/10 text-neon-green border-neon-green/20",
  CANCELLED: "bg-neon-red/10 text-neon-red border-neon-red/20",
};
const STATUS_LABELS: Record<string, string> = {
  REGISTRATION_OPEN: "Registration Open", IN_PROGRESS: "Live", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { not: "DRAFT" } },
    include: { _count: { select: { participants: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const live = tournaments.filter(t => t.status === "IN_PROGRESS" || t.status === "REGISTRATION_OPEN");
  const past = tournaments.filter(t => t.status === "COMPLETED" || t.status === "CANCELLED");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <RealtimeRefresh events={["tournaments_list_update", "tournament_update"]} />
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-bg-surface via-bg-elevated to-purple-500/5 border border-bg-border p-8 sm:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-purple-400" />
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Competitive</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight">
            Tournaments<br />
            <span className="text-purple-400">& Leagues</span>
          </h1>
          <p className="text-text-muted mt-4 max-w-md">Compete in organized tournaments. League round-robins and knockout brackets — prove you&apos;re the best.</p>
        </div>
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
      </div>

      {live.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" /> Active</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map(t => <TournamentCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4 text-text-muted">Past Tournaments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map(t => <TournamentCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      {tournaments.length === 0 && (
        <div className="text-center py-20">
          <Trophy size={48} className="mx-auto mb-4 text-text-muted opacity-20" />
          <p className="text-text-muted">No tournaments scheduled yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t }: { t: { id: string; name: string; slug: string; game: string; type: string; status: string; maxParticipants: number; entryFee: unknown; prizePool: unknown; currency: string; startDate: Date | null; _count: { participants: number } } }) {
  return (
    <Link href={`/tournaments/${t.slug}`} className="group block">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 hover:border-neon-blue/30 hover:-translate-y-0.5 transition-all duration-300 h-full">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${t.type === "KNOCKOUT" ? "bg-purple-500/10 border-purple-500/20" : "bg-neon-blue/10 border-neon-blue/20"}`}>
            <Trophy size={16} className={t.type === "KNOCKOUT" ? "text-purple-400" : "text-neon-blue"} />
          </div>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", STATUS_COLORS[t.status] ?? "bg-text-muted/10 text-text-muted border-bg-border")}>
            {STATUS_LABELS[t.status] ?? t.status}
          </span>
        </div>
        <h3 className="font-bold group-hover:text-neon-blue transition-colors">{t.name}</h3>
        <p className="text-sm text-text-muted mt-0.5">{t.game}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1"><Users size={11} /> {t._count.participants}/{t.maxParticipants}</span>
          {t.startDate && <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(t.startDate).toLocaleDateString()}</span>}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${t.type === "KNOCKOUT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-neon-blue/10 text-neon-blue border-neon-blue/20"}`}>
            {t.type === "KNOCKOUT" ? "Knockout" : "League"}
          </span>
          {Number(t.prizePool) > 0 && <span className="text-neon-green font-bold text-sm">KES {Number(t.prizePool).toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  );
}
