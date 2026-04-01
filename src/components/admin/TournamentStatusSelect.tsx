"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "REGISTRATION_OPEN", label: "Registration Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function TournamentStatusSelect({ tournamentId, currentStatus }: { tournamentId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setLoading(true);
    try {
      await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        defaultValue={currentStatus}
        onChange={handleChange}
        disabled={loading}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-bg-border text-text-primary focus:outline-none focus:border-neon-blue/50 disabled:opacity-50"
      >
        {STATUSES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {loading && <Loader2 size={12} className="animate-spin text-text-muted" />}
    </div>
  );
}
