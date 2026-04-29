"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface Props {
  challengeId: string;
  challengerName: string;
  wagerAmount: string;
}

export function ChallengeUnmatchPanel({ challengeId, challengerName, wagerAmount }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  async function unmatch() {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/challenges/${challengeId}/unmatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to unmatch"); setLoading(false); return; }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="border border-neon-yellow/30 bg-neon-yellow/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserX size={16} className="text-neon-yellow" />
        <h3 className="text-sm font-semibold text-neon-yellow">Unmatch Challenger</h3>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        This will remove <span className="font-semibold text-text-primary">{challengerName}</span> from the challenge,
        refund their wager of <span className="font-semibold text-text-primary">KES {wagerAmount}</span> to their wallet,
        and reopen the challenge for others to join.
      </p>
      <div>
        <label className="block text-xs font-medium text-text-primary mb-1.5">
          Reason <span className="text-neon-red">*</span>
        </label>
        <Textarea
          value={reason}
          onChange={(e) => { setReason(e.target.value); setConfirm(false); setError(""); }}
          placeholder="Explain why the challenger is being unmatched…"
          rows={3}
          maxLength={1000}
        />
        <p className="text-[11px] text-text-muted mt-1">{reason.length}/1000 · minimum 10 characters</p>
      </div>

      {confirm && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-neon-yellow/10 border border-neon-yellow/30">
          <AlertTriangle size={14} className="text-neon-yellow shrink-0 mt-0.5" />
          <p className="text-xs text-neon-yellow">
            This will refund {challengerName}&apos;s wager and reopen the challenge. Click again to confirm.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-neon-red">{error}</p>}

      <Button
        variant="outline"
        className="border-neon-yellow/40 text-neon-yellow hover:bg-neon-yellow/10"
        onClick={unmatch}
        disabled={loading || reason.trim().length < 10}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Unmatching…</>
        ) : confirm ? (
          <><AlertTriangle size={14} /> Confirm unmatch</>
        ) : (
          <><UserX size={14} /> Unmatch challenger</>
        )}
      </Button>
    </div>
  );
}
