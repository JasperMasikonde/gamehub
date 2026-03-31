export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-text-muted/10 text-text-muted border-bg-border",
  REGISTRATION_OPEN: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  COMPLETED: "bg-neon-green/10 text-neon-green border-neon-green/20",
  CANCELLED: "bg-neon-red/10 text-neon-red border-neon-red/20",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", REGISTRATION_OPEN: "Registration Open", IN_PROGRESS: "In Progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

export default async function AdminTournamentsPage() {
  await requireAdmin();
  const tournaments = await prisma.tournament.findMany({
    include: { _count: { select: { participants: true, matches: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-text-muted text-sm mt-1">{tournaments.length} total</p>
        </div>
        <Link href="/admin/tournaments/new">
          <Button variant="primary" size="sm"><Plus size={15} /> New Tournament</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {tournaments.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Trophy size={36} className="mx-auto mb-3 opacity-20" />
            <p>No tournaments yet.</p>
          </div>
        )}
        {tournaments.map(t => (
          <Link key={t.id} href={`/admin/tournaments/${t.id}`} className="flex items-center justify-between p-5 bg-bg-surface border border-bg-border rounded-2xl hover:border-neon-blue/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${t.type === "KNOCKOUT" ? "bg-purple-500/10 border-purple-500/20" : "bg-neon-blue/10 border-neon-blue/20"}`}>
                <Trophy size={16} className={t.type === "KNOCKOUT" ? "text-purple-400" : "text-neon-blue"} />
              </div>
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-text-muted">{t.game} · {t.type === "KNOCKOUT" ? "Knockout" : "League"} · {t._count.participants}/{t.maxParticipants} players</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {Number(t.prizePool) > 0 && <span className="text-sm font-bold text-neon-green">KES {Number(t.prizePool).toLocaleString()}</span>}
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", STATUS_COLORS[t.status])}>
                {STATUS_LABELS[t.status]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
