import { requireAdmin } from "@/lib/auth";
import { TournamentForm } from "@/components/admin/TournamentForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewTournamentPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tournaments" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-2xl font-bold">New Tournament</h1>
          <p className="text-text-muted text-sm">Set up a league or knockout tournament</p>
        </div>
      </div>
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
        <TournamentForm />
      </div>
    </div>
  );
}
