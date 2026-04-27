"use client";

import { useState } from "react";
import { Loader2, Swords } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ChallengeSpotlightToggle({ enabled }: { enabled: boolean }) {
  const [active, setActive] = useState(enabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/config/challenge-spotlight", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !active }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update"); return; }
      setActive(data.showChallengeSpotlight);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Swords size={16} className="text-neon-red" />
        <h2 className="text-base font-semibold">Challenge Spotlight</h2>
      </div>

      <p className="text-xs text-text-muted leading-relaxed">
        When enabled, a <strong>randomly selected open challenge</strong> is shown on the homepage to attract challengers. Rotates on every page load. Hidden automatically when no open challenges exist.
      </p>

      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-colors cursor-pointer",
          active
            ? "bg-neon-red/5 border-neon-red/20 hover:bg-neon-red/10"
            : "bg-bg-elevated border-bg-border hover:border-bg-border/80"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
            active
              ? "bg-neon-red/10 border-neon-red/25 text-neon-red"
              : "bg-bg-surface border-bg-border text-text-muted"
          )}>
            <Swords size={14} />
          </div>
          <div className="text-left min-w-0">
            <p className={cn("text-sm font-semibold", active ? "text-text-primary" : "text-text-muted")}>
              {active ? "Spotlight is live" : "Spotlight is off"}
            </p>
            <p className="text-xs text-text-muted truncate">
              {active ? "Visitors see a random open challenge on the homepage" : "No challenge card shown on the homepage"}
            </p>
          </div>
        </div>

        {/* Toggle track */}
        <div className={cn(
          "w-10 h-5 rounded-full relative shrink-0 transition-colors",
          active ? "bg-neon-red" : "bg-bg-border"
        )}>
          {loading ? (
            <Loader2 size={11} className="absolute inset-0 m-auto animate-spin text-white" />
          ) : (
            <span className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
              active ? "translate-x-5" : "translate-x-0.5"
            )} />
          )}
        </div>
      </button>

      {error && (
        <p className="text-xs text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
