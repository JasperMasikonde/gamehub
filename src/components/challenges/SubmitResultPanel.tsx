"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export function SubmitResultPanel({
  challengeId,
  isHost,
  alreadySubmitted,
}: {
  challengeId: string;
  isHost: boolean;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<"HOST_WIN" | "CHALLENGER_WIN" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (alreadySubmitted) {
    return (
      <div className="bg-neon-yellow/5 border border-neon-yellow/20 rounded-xl p-4 text-center">
        <p className="text-sm font-medium text-neon-yellow">Result submitted</p>
        <p className="text-xs text-text-muted mt-1">Waiting for your opponent to submit their result.</p>
      </div>
    );
  }

  const submit = async () => {
    if (!selected) { setError("Select a result first"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/submit-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: selected }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit"); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-neon-green/30 bg-neon-green/5 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-neon-green flex items-center gap-2">
        <Trophy size={14} />
        Submit Match Result
      </p>
      <p className="text-xs text-text-muted">Who won the match series?</p>

      <div className="grid grid-cols-2 gap-3">
        {(["HOST_WIN", "CHALLENGER_WIN"] as const).map((r) => {
          const isWin = (isHost && r === "HOST_WIN") || (!isHost && r === "CHALLENGER_WIN");
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={cn(
                "py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all",
                selected === r
                  ? isWin
                    ? "border-neon-green bg-neon-green/10 text-neon-green"
                    : "border-neon-red bg-neon-red/10 text-neon-red"
                  : "border-bg-border text-text-muted hover:border-bg-border/80"
              )}
            >
              {isWin ? <><Trophy size={13} className="inline mr-1" />I won</> : <><X size={13} className="inline mr-1" />I lost</>}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button variant="primary" className="w-full" onClick={submit} loading={loading} disabled={!selected}>
        Confirm Result
      </Button>
    </div>
  );
}
