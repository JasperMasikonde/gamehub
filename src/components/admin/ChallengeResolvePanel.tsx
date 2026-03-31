"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

interface Party {
  id: string;
  username: string;
  displayName: string | null;
}

export function ChallengeResolvePanel({
  challengeId,
  host,
  challenger,
}: {
  challengeId: string;
  host: Party;
  challenger: Party;
}) {
  const router = useRouter();
  const [winnerId, setWinnerId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!winnerId) { setError("Select a winner"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/challenges/${challengeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, adminNote: adminNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-neon-red/30 bg-neon-red/5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-neon-red" />
        <h3 className="text-sm font-semibold text-neon-red">Resolve Dispute — Award Winner</h3>
      </div>

      <div className="flex gap-3">
        {[host, challenger].map((p) => (
          <button
            key={p.id}
            onClick={() => setWinnerId(p.id)}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors ${
              winnerId === p.id
                ? "border-neon-green bg-neon-green/10 text-neon-green"
                : "border-bg-border bg-bg-elevated text-text-muted hover:border-neon-green/30 hover:text-text-primary"
            }`}
          >
            {p.displayName ?? p.username}
          </button>
        ))}
      </div>

      <textarea
        value={adminNote}
        onChange={(e) => setAdminNote(e.target.value)}
        placeholder="Admin note (optional) — explain decision to parties"
        rows={2}
        maxLength={500}
        className="w-full resize-none bg-bg-elevated border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/40 transition-colors"
      />

      {error && <p className="text-xs text-neon-red">{error}</p>}

      <button
        onClick={submit}
        disabled={!winnerId || loading}
        className="w-full py-2.5 rounded-xl bg-neon-green text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {loading ? "Resolving…" : "Confirm Winner & Close Dispute"}
      </button>
    </div>
  );
}
