"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function DeleteDemoChallengesButton() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/challenges/delete-demo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
      setResult(`Deleted ${data.deleted} demo challenge${data.deleted !== 1 ? "s" : ""}.`);
      setConfirm(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-neon-red/25 bg-neon-red/5">
      <div className="flex items-center gap-2">
        <Trash2 size={15} className="text-neon-red" />
        <p className="text-sm font-semibold text-neon-red">Delete Demo Challenges</p>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        Permanently removes all challenges seeded by <code className="bg-bg-elevated px-1 rounded text-[11px]">npm run db:seed-demo</code>.
        No refunds or notifications are sent — these are fake records with no real payments.
      </p>

      {confirm && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30">
          <AlertTriangle size={13} className="text-neon-red shrink-0 mt-0.5" />
          <p className="text-xs text-neon-red">This will hard-delete all DEMO_SEED challenges. Click again to confirm.</p>
        </div>
      )}

      {result && <p className="text-xs text-neon-green">{result}</p>}
      {error && <p className="text-xs text-neon-red">{error}</p>}

      <button
        onClick={handleDelete}
        disabled={loading}
        className={cn(
          "self-start flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
          "border-neon-red/40 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 disabled:opacity-50"
        )}
      >
        {loading
          ? <><Loader2 size={12} className="animate-spin" /> Deleting…</>
          : confirm
            ? <><AlertTriangle size={12} /> Confirm delete</>
            : <><Trash2 size={12} /> Delete demo challenges</>
        }
      </button>
    </div>
  );
}
