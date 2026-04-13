"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export function ChallengeRemovePanel({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  async function remove() {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/challenges/${challengeId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to remove"); setLoading(false); return; }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="border border-neon-red/30 bg-neon-red/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 size={16} className="text-neon-red" />
        <h3 className="text-sm font-semibold text-neon-red">Remove Challenge</h3>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        Removing this challenge will cancel it and refund any paid wagers to the players&apos; wallets.
        Both parties will be notified by email with the reason you provide.
      </p>
      <div>
        <label className="block text-xs font-medium text-text-primary mb-1.5">
          Reason <span className="text-neon-red">*</span>
        </label>
        <Textarea
          value={reason}
          onChange={(e) => { setReason(e.target.value); setConfirm(false); setError(""); }}
          placeholder="Explain why this challenge is being removed…"
          rows={3}
          maxLength={1000}
        />
        <p className="text-[11px] text-text-muted mt-1">{reason.length}/1000 · minimum 10 characters</p>
      </div>

      {confirm && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30">
          <AlertTriangle size={14} className="text-neon-red shrink-0 mt-0.5" />
          <p className="text-xs text-neon-red">
            Are you sure? This will cancel the challenge, refund wagers, and email both players.
            Click again to confirm.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-neon-red">{error}</p>}

      <Button
        variant="outline"
        className="border-neon-red/40 text-neon-red hover:bg-neon-red/10"
        onClick={remove}
        disabled={loading || reason.trim().length < 10}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Removing…</>
        ) : confirm ? (
          <><AlertTriangle size={14} /> Confirm removal</>
        ) : (
          <><Trash2 size={14} /> Remove challenge</>
        )}
      </Button>
    </div>
  );
}
