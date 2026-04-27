"use client";

import { useState } from "react";
import { Loader2, Swords } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ChallengeSpotlightToggle({ enabled }: { enabled: boolean }) {
  const [active, setActive] = useState(enabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/config/challenge-spotlight", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !active }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update"); return; }
      setActive(data.showChallengeSpotlight);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
            active ? "bg-neon-red/10 border-neon-red/25 text-neon-red" : "bg-bg-elevated border-bg-border text-text-muted"
          )}>
            <Swords size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">Open Challenge Spotlight</p>
            <p className="text-xs text-text-muted">
              Shows a randomly selected open challenge on the homepage to attract challengers.
            </p>
          </div>
        </div>

        <button
          onClick={toggle}
          disabled={loading}
          className={cn(
            "w-12 h-6 rounded-full relative transition-colors shrink-0",
            active ? "bg-neon-red" : "bg-bg-border",
            loading && "opacity-60"
          )}
          aria-label={active ? "Disable challenge spotlight" : "Enable challenge spotlight"}
        >
          {loading ? (
            <Loader2 size={12} className="absolute inset-0 m-auto animate-spin text-white" />
          ) : (
            <span className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
              active ? "translate-x-7" : "translate-x-1"
            )} />
          )}
        </button>
      </div>

      <p className={cn(
        "text-xs font-semibold",
        active ? "text-neon-red" : "text-text-muted"
      )}>
        {active ? "ON — visitors can see open challenges on the homepage" : "OFF — challenge spotlight is hidden from the homepage"}
      </p>

      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}
