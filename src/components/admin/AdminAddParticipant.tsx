"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, X } from "lucide-react";

interface Participant {
  id: string;
  userId: string;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

export function AdminAddParticipant({
  tournamentId,
  participants,
  status,
}: {
  tournamentId: string;
  participants: Participant[];
  status: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canRemove = status !== "IN_PROGRESS" && status !== "COMPLETED";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to add participant"); return; }
      setSuccess(`Added ${d.participant.user.displayName ?? d.participant.user.username}`);
      setQuery("");
      router.refresh();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/participants/${userId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      router.refresh();
    } catch { setError("Network error"); }
    finally { setRemoving(null); }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Username or email…"
          className="flex-1 px-3 py-2 text-sm rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/50"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neon-blue/10 text-neon-blue border border-neon-blue/20 text-sm font-medium hover:bg-neon-blue/20 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Add
        </button>
      </form>
      {error && <p className="text-xs text-neon-red">{error}</p>}
      {success && <p className="text-xs text-neon-green">{success}</p>}

      <div className="divide-y divide-bg-border max-h-64 overflow-y-auto rounded-xl border border-bg-border">
        {participants.length === 0 && (
          <p className="p-3 text-sm text-text-muted">No participants yet.</p>
        )}
        {participants.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            <span className="text-xs text-text-muted w-5">{i + 1}</span>
            <div className="w-7 h-7 rounded-full bg-bg-elevated border border-bg-border overflow-hidden shrink-0">
              {p.user.avatarUrl
                ? <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">{(p.user.displayName ?? p.user.username)[0]}</div>
              }
            </div>
            <span className="text-sm flex-1">{p.user.displayName ?? p.user.username}</span>
            <span className="text-xs text-text-muted">@{p.user.username}</span>
            {canRemove && (
              <button
                onClick={() => handleRemove(p.user.id)}
                disabled={removing === p.user.id}
                className="text-text-muted hover:text-neon-red transition-colors disabled:opacity-40"
                title="Remove participant"
              >
                {removing === p.user.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
