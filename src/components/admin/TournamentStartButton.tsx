"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, Play } from "lucide-react";

export function TournamentStartButton({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function start() {
    if (!confirm("Generate bracket/schedule and start the tournament? This cannot be undone.")) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/start`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed"); return; }
      router.refresh();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }
  return (
    <div>
      <Button variant="primary" onClick={start} disabled={loading}>
        {loading ? <><Loader2 size={14} className="animate-spin" /> Starting…</> : <><Play size={14} /> Start Tournament</>}
      </Button>
      {error && <p className="text-xs text-neon-red mt-1">{error}</p>}
    </div>
  );
}
