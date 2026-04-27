"use client";

import { useRef, useState } from "react";
import { Share2, Download, X, LayoutList, Trophy, Loader2 } from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import { FixturesCard, StandingsCard } from "./TournamentShareCards";
import type { FixtureMatch, StandingRow } from "./TournamentShareCards";

interface Props {
  tournamentName: string;
  game: string;
  gameweek: number | null;
  fixtures: FixtureMatch[];
  standings: StandingRow[];
  hasStandings: boolean;
}

type Tab = "fixtures" | "standings";
type Fmt = "png" | "jpeg";

export function TournamentShareButton({
  tournamentName,
  game,
  gameweek,
  fixtures,
  standings,
  hasStandings,
}: Props) {
  const [open, setOpen]       = useState(false);
  const [tab, setTab]         = useState<Tab>("fixtures");
  const [fmt, setFmt]         = useState<Fmt>("png");
  const [saving, setSaving]   = useState(false);

  const fixturesRef  = useRef<HTMLDivElement>(null);
  const standingsRef = useRef<HTMLDivElement>(null);

  async function download() {
    const node = tab === "fixtures" ? fixturesRef.current : standingsRef.current;
    if (!node) return;
    setSaving(true);
    try {
      const fn = fmt === "jpeg" ? toJpeg : toPng;
      const dataUrl = await fn(node, {
        quality: 0.97,
        pixelRatio: 2,           // retina-quality for WhatsApp
        backgroundColor: "#08080f",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${tournamentName.replace(/\s+/g, "-")}-${tab === "fixtures" ? `gw${gameweek ?? "fixtures"}` : "standings"}.${fmt}`;
      a.click();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-purple/10 border border-neon-purple/25 text-neon-purple text-xs font-semibold hover:bg-neon-purple/20 transition-colors"
      >
        <Share2 size={12} />
        Share
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-bg-surface border border-bg-border rounded-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border shrink-0">
              <div>
                <h2 className="font-bold text-base">Share to WhatsApp</h2>
                <p className="text-xs text-text-muted mt-0.5">Download a professional image to share with your group</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-bg-elevated border border-bg-border text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-5 pt-4 shrink-0">
              <button
                onClick={() => setTab("fixtures")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  tab === "fixtures"
                    ? "bg-neon-blue/15 border-neon-blue/30 text-neon-blue"
                    : "bg-bg-elevated border-bg-border text-text-muted hover:text-text-primary"
                }`}
              >
                <LayoutList size={13} /> Fixtures
              </button>
              {hasStandings && (
                <button
                  onClick={() => setTab("standings")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    tab === "standings"
                      ? "bg-neon-green/15 border-neon-green/30 text-neon-green"
                      : "bg-bg-elevated border-bg-border text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Trophy size={13} /> Standings
                </button>
              )}

              {/* Format picker */}
              <div className="ml-auto flex items-center gap-1 bg-bg-elevated border border-bg-border rounded-xl p-1">
                {(["png", "jpeg"] as Fmt[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFmt(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      fmt === f ? "bg-bg-surface text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Card preview */}
            <div className="flex-1 overflow-auto p-5 min-h-0">
              <div className="flex justify-center">
                {/* Both cards rendered; only the active one is visible via display */}
                <div style={{ display: tab === "fixtures" ? "block" : "none" }}>
                  <FixturesCard
                    cardRef={fixturesRef}
                    tournamentName={tournamentName}
                    game={game}
                    gameweek={gameweek}
                    matches={fixtures}
                  />
                </div>
                <div style={{ display: tab === "standings" ? "block" : "none" }}>
                  <StandingsCard
                    cardRef={standingsRef}
                    tournamentName={tournamentName}
                    game={game}
                    gameweek={gameweek}
                    rows={standings}
                  />
                </div>
              </div>
            </div>

            {/* Download bar */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-bg-border">
              <p className="text-xs text-text-muted leading-relaxed">
                2× resolution — ready for WhatsApp
              </p>
              <button
                onClick={() => void download()}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neon-green text-bg-primary font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-all shadow-[0_0_16px_rgba(0,255,135,0.3)]"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                  : <><Download size={14} /> Download {fmt.toUpperCase()}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
