"use client";

import { useState } from "react";
import { CheckCircle, Clock, RotateCcw, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

interface Props {
  slug: string;
  matchId: string;
  proposedMatchTime: string | null;
  proposedById: string | null;
  myId: string;
  scheduledAt: string | null;
  opponentName: string;
  matchDeadline: string | null;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "long", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDayLabel(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const tom = new Date(now); tom.setDate(tom.getDate() + 1);
  if (d.toDateString() === tom.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

// ── Time slot data ────────────────────────────────────────────────────────────

const ALL_SLOTS = [
  { label: "12 PM", h: 12, m: 0 },
  { label: "2 PM",  h: 14, m: 0 },
  { label: "4 PM",  h: 16, m: 0 },
  { label: "5 PM",  h: 17, m: 0 },
  { label: "6 PM",  h: 18, m: 0 },
  { label: "6:30",  h: 18, m: 30 },
  { label: "7 PM",  h: 19, m: 0 },
  { label: "7:30",  h: 19, m: 30 },
  { label: "8 PM",  h: 20, m: 0 },
  { label: "8:30",  h: 20, m: 30 },
  { label: "9 PM",  h: 21, m: 0 },
  { label: "10 PM", h: 22, m: 0 },
] as const;

type Slot = (typeof ALL_SLOTS)[number];

const MIN_BUFFER_MS = 30 * 60 * 1000; // 30-min minimum from now

function getDateOptions(deadline?: Date | null): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    if (deadline) {
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      if (dayEnd > deadline) { break; } // don't offer days past deadline
    }
    dates.push(d);
  }
  return dates;
}

function availableSlotsFor(date: Date, deadline?: Date | null): Slot[] {
  const cutoff = Date.now() + MIN_BUFFER_MS;
  return ALL_SLOTS.filter(s => {
    const t = new Date(date); t.setHours(s.h, s.m, 0, 0);
    if (t.getTime() <= cutoff) return false;
    if (deadline && t > deadline) return false;
    return true;
  });
}

function buildISO(date: Date, slot: Slot): string {
  const d = new Date(date);
  d.setHours(slot.h, slot.m, 0, 0);
  return d.toISOString();
}

function buildCustomISO(date: Date, timeStr: string): string | null {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ── Inner time-picker ─────────────────────────────────────────────────────────

interface PickerProps {
  onPropose: (iso: string) => void;
  loading: boolean;
  error: string;
  ctaLabel?: string;
  deadline?: Date | null;
}

function TimePicker({ onPropose, loading, error, ctaLabel = "Propose this time", deadline }: PickerProps) {
  const dates = getDateOptions(deadline);
  const [selDate, setSelDate] = useState<Date>(dates[0] ?? new Date());
  const [selSlot, setSelSlot] = useState<Slot | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [customError, setCustomError] = useState("");

  function validateCustom(timeStr: string, forDate: Date): string {
    const iso = buildCustomISO(forDate, timeStr);
    if (!iso) return "Invalid time.";
    const t = new Date(iso).getTime();
    if (t <= Date.now() + MIN_BUFFER_MS) return "That time has already passed.";
    if (deadline && new Date(iso) > deadline) {
      return `Must be before the deadline: ${fmtShort(deadline.toISOString())}`;
    }
    return "";
  }

  function pickDate(d: Date) {
    setSelDate(d);
    if (selSlot) {
      const still = availableSlotsFor(d, deadline).find(s => s.h === selSlot.h && s.m === selSlot.m);
      if (!still) setSelSlot(null);
    }
    if (customTime) setCustomError(validateCustom(customTime, d));
  }

  function pickSlot(s: Slot) {
    setSelSlot(prev => (prev?.h === s.h && prev?.m === s.m ? null : s));
    setCustomTime("");
    setCustomError("");
  }

  function handleCustomChange(val: string) {
    setCustomTime(val);
    setSelSlot(null);
    setCustomError(val ? validateCustom(val, selDate) : "");
  }

  const slots = availableSlotsFor(selDate, deadline);

  const previewISO = selSlot
    ? buildISO(selDate, selSlot)
    : customTime && !customError
      ? buildCustomISO(selDate, customTime)
      : null;

  function handleCta() {
    if (previewISO) onPropose(previewISO);
  }

  return (
    <div className="space-y-5">
      {/* Deadline banner */}
      {deadline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-xs text-yellow-400">
          <Clock size={11} className="shrink-0" />
          Deadline: {fmtFull(deadline.toISOString())}
        </div>
      )}

      {/* Day row */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">Day</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {dates.map((d, i) => {
            const hasTimes = availableSlotsFor(d, deadline).length > 0;
            const isSel = d.toDateString() === selDate.toDateString();
            return (
              <button
                key={i}
                disabled={!hasTimes}
                onClick={() => hasTimes && pickDate(d)}
                className={cn(
                  "shrink-0 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all active:scale-95",
                  isSel
                    ? "bg-neon-blue border-neon-blue text-bg-primary shadow-[0_0_12px_rgba(0,212,255,0.35)]"
                    : hasTimes
                    ? "bg-bg-elevated border-bg-border text-text-primary hover:border-neon-blue/40"
                    : "bg-bg-elevated border-bg-border text-text-muted opacity-30 cursor-not-allowed"
                )}
              >
                {fmtDayLabel(d)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">Time</p>
        {slots.length === 0 ? (
          <p className="text-sm text-text-muted italic">No slots left today — pick another day.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map(s => {
              const isSel = selSlot?.h === s.h && selSlot?.m === s.m;
              return (
                <button
                  key={`${s.h}-${s.m}`}
                  onClick={() => pickSlot(s)}
                  className={cn(
                    "py-3 rounded-2xl border text-sm font-bold transition-all active:scale-95",
                    isSel
                      ? "bg-neon-green border-neon-green text-bg-primary shadow-[0_0_12px_rgba(0,255,135,0.35)]"
                      : "bg-bg-elevated border-bg-border text-text-primary hover:border-neon-green/40"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom time */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Custom time</p>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={customTime}
            onChange={e => handleCustomChange(e.target.value)}
            className={cn(
              "flex-1 min-w-0 px-4 py-3 rounded-2xl border bg-bg-elevated text-sm font-semibold text-text-primary",
              "focus:outline-none transition-colors",
              customTime && !customError
                ? "border-neon-green text-neon-green"
                : customError
                ? "border-neon-red"
                : "border-bg-border focus:border-neon-green/60"
            )}
          />
          {customTime && !customError && (
            <button
              onClick={() => { setCustomTime(""); setCustomError(""); }}
              className="text-xs text-text-muted hover:text-text-primary shrink-0"
            >
              Clear
            </button>
          )}
        </div>
        {customError && <p className="mt-1.5 text-xs text-neon-red">{customError}</p>}
      </div>

      {/* Preview + CTA */}
      {previewISO && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-bg-surface border border-bg-border">
            <Clock size={13} className="text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">{fmtShort(previewISO)}</span>
          </div>
          <Button
            className="w-full h-12 text-sm font-bold glow-green"
            variant="primary"
            onClick={handleCta}
            loading={loading}
          >
            {ctaLabel}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TournamentMatchSchedule({
  slug, matchId, myId,
  proposedMatchTime: initProposed,
  proposedById: initProposedBy,
  scheduledAt: initScheduled,
  opponentName,
  matchDeadline,
}: Props) {
  const deadline = matchDeadline ? new Date(matchDeadline) : null;
  const [proposed, setProposed]       = useState(initProposed);
  const [proposedBy, setProposedBy]   = useState(initProposedBy);
  const [scheduled, setScheduled]     = useState(initScheduled);
  const [showPicker, setShowPicker]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const iMadeProposal    = proposed !== null && proposedBy === myId;
  const theyMadeProposal = proposed !== null && proposedBy !== myId;

  async function apiCall(action: string, scheduledAt?: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/tournaments/${slug}/matches/${matchId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "propose" ? { action, scheduledAt } : { action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setError(j.error ?? "Something went wrong");
        return;
      }
      const { match } = await res.json() as {
        match: { proposedMatchTime: string | null; proposedById: string | null; scheduledAt: string | null };
      };
      setProposed(match.proposedMatchTime);
      setProposedBy(match.proposedById);
      setScheduled(match.scheduledAt);
      setShowPicker(false);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── STATE: Agreed ──────────────────────────────────────────────────────────
  if (scheduled) {
    return (
      <div className="rounded-2xl border border-neon-green/25 bg-neon-green/5 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-full bg-neon-green/20 border border-neon-green/30 flex items-center justify-center shrink-0">
            <CheckCircle size={15} className="text-neon-green" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neon-green">Match time agreed!</p>
            <p className="text-sm font-bold text-text-primary mt-0.5 truncate">{fmtFull(scheduled)}</p>
          </div>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors py-1"
          >
            <RotateCcw size={11} />
            {showPicker ? "Cancel" : "Reschedule"}
            {showPicker ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
        {showPicker && (
          <div className="border-t border-neon-green/15 px-4 py-4">
            <TimePicker
              onPropose={iso => void apiCall("propose", iso)}
              loading={loading}
              error={error}
              deadline={deadline}
              ctaLabel="Propose new time"
            />
          </div>
        )}
      </div>
    );
  }

  // ── STATE: They proposed ───────────────────────────────────────────────────
  if (theyMadeProposal && proposed) {
    return (
      <div className="rounded-2xl border border-neon-blue/30 bg-neon-blue/5 overflow-hidden">
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-neon-blue shrink-0" />
            <p className="text-xs font-bold text-neon-blue uppercase tracking-wide">
              {opponentName} wants to play at:
            </p>
          </div>
          <div className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-bg-elevated border border-bg-border">
            <Clock size={16} className="text-text-muted shrink-0" />
            <p className="text-base font-bold text-text-primary">{fmtFull(proposed)}</p>
          </div>

          <button
            onClick={() => void apiCall("accept")}
            disabled={loading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 rounded-2xl",
              "bg-neon-green text-bg-primary font-bold text-base transition-all active:scale-[0.98]",
              "shadow-[0_0_20px_rgba(0,255,135,0.35)] hover:shadow-[0_0_28px_rgba(0,255,135,0.5)]",
              loading && "opacity-60 cursor-not-allowed"
            )}
          >
            <CheckCircle size={18} />
            {loading ? "Accepting…" : "Accept — let's play!"}
          </button>

          <button
            onClick={() => setShowPicker(p => !p)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <RotateCcw size={13} />
            {showPicker ? "Hide picker" : "Suggest a different time"}
            {showPicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {showPicker && (
          <div className="border-t border-neon-blue/15 px-4 py-4">
            <TimePicker
              onPropose={iso => void apiCall("propose", iso)}
              loading={loading}
              error={error}
              deadline={deadline}
              ctaLabel="Send counter-proposal"
            />
          </div>
        )}

        {error && !showPicker && <p className="px-4 pb-3 text-xs text-neon-red">{error}</p>}
      </div>
    );
  }

  // ── STATE: I proposed, waiting ─────────────────────────────────────────────
  if (iMadeProposal && proposed) {
    return (
      <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0 animate-pulse">
            <Clock size={15} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-yellow-400">Waiting for {opponentName}…</p>
            <p className="text-sm font-bold text-text-primary mt-0.5 truncate">{fmtFull(proposed)}</p>
          </div>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors py-1"
          >
            <RotateCcw size={11} />
            {showPicker ? "Cancel" : "Change"}
            {showPicker ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
        {showPicker && (
          <div className="border-t border-yellow-500/15 px-4 py-4">
            <TimePicker
              onPropose={iso => void apiCall("propose", iso)}
              loading={loading}
              error={error}
              deadline={deadline}
              ctaLabel="Update my proposal"
            />
          </div>
        )}
      </div>
    );
  }

  // ── STATE: No proposal yet ─────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-elevated overflow-hidden">
      <div className="px-4 py-3.5 border-b border-bg-border flex items-center gap-2">
        <Clock size={14} className="text-neon-blue shrink-0" />
        <p className="text-sm font-semibold">Agree on a match time</p>
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Pick a day and time below — {opponentName} will receive your proposal and can accept or suggest a different time.
        </p>
        <TimePicker
          onPropose={iso => void apiCall("propose", iso)}
          loading={loading}
          error={error}
          deadline={deadline}
          ctaLabel={`Propose to ${opponentName}`}
        />
      </div>
    </div>
  );
}
