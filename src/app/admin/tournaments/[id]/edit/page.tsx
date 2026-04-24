export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TournamentForm } from "@/components/admin/TournamentForm";

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) notFound();

  const defaultValues = {
    name: tournament.name,
    slug: tournament.slug,
    game: tournament.game,
    type: tournament.type,
    maxParticipants: tournament.maxParticipants,
    requiresPayment: tournament.requiresPayment,
    entryFee: String(tournament.entryFee),
    prizePool: String(tournament.prizePool),
    description: tournament.description ?? "",
    rules: tournament.rules ?? "",
    startDate: tournament.startDate ? new Date(tournament.startDate).toISOString().slice(0, 16) : "",
    endDate: tournament.endDate ? new Date(tournament.endDate).toISOString().slice(0, 16) : "",
    homeAndAway: tournament.homeAndAway,
    groupCount: tournament.groupCount ?? undefined,
    groupsAdvance: tournament.groupsAdvance ?? undefined,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/tournaments/${id}`} className="text-text-muted hover:text-text-primary">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Tournament</h1>
          <p className="text-text-muted text-sm mt-0.5">{tournament.name}</p>
        </div>
      </div>
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
        <TournamentForm tournamentId={id} defaultValues={defaultValues} />
      </div>
    </div>
  );
}
