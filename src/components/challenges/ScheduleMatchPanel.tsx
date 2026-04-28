"use client";

import { useState } from "react";
import { CheckCircle, Clock, RotateCcw, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

interface Props {
  challengeId: string;
  isHost: boolean;
  proposedMatchTime: string | null;
  proposedByHost: boolean | null;
  scheduledAt: string | null;
  resultDeadlineAt: string | null;
  resultWindowMinutes: number;
  matchedAt: string | null;
  opponentName: string;
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

interface Slot { label: string; h: number; m: number }

function fmtSlotLabel(h: number, m: number): string {
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")}`;
}

function getDateOptions(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

// Generate slots in 10-min increments anchored to matchedAt's minute offset.
// Only returns slots after both matchedAt+10min and now+1hr.
function availableSlotsFor(date: Date, matchedAt: Date): Slot[] {
  const cutoff = Math.max(
    matchedAt.getTime() + 10 * 60 * 1000,
    Date.now() + 60 * 60 * 1000,
  );
  const minuteOffset = matchedAt.getMinutes() % 10;
  const slots: Slot[] = [];
  for (let h = 0; h < 24; h++) {
    for (let step = 0; step < 6; step++) {
      const m = (minuteOffset + step * 10) % 60;
      const slotDate = new Date(date);
      slotDate.setHours(h, m, 0, 0);
      if (slotDate.getTime() > cutoff) {
        slots.push({ label: fmtSlotLabel(h, m), h, m });
        if (slots.length === 24) return slots;
      }
    }
  }
  return slots;
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
  matchedAt: Date;
  ctaLabel?: string;
}

function TimePicker({ onPropose, loading, error, matchedAt, ctaLabel = "Propose this time" }: PickerProps) {
  const dates = getDateOptions();
  const [selDate, setSelDate] = useState<Date>(dates[0]);
  const [selSlot, setSelSlot] = useState<Slot | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [customError, setCustomError] = useState("");

  function pickDate(d: Date) {
    setSelDate(d);
    setCustomError("");
    if (selSlot) {
      const still = availableSlotsFor(d, matchedAt).find(s => s.h === selSlot.h && s.m === selSlot.m);
      if (!still) setSelSlot(null);
    }
    if (customTime) {
      const iso = buildCustomISO(d, customTime);
      if (iso && new Date(iso).getTime() <= Date.now() + 60 * 60 * 1000) {
        setCustomError("That time has passed — pick a later time.");
      }
    }
  }

  function pickSlot(s: Slot) {
    setSelSlot(prev => (prev?.h === s.h && prev?.m === s.m ? null : s));
    setCustomTime("");
    setCustomError("");
  }

  function handleCustomChange(val: string) {
    setCustomTime(val);
    setSelSlot(null);
    setCustomError("");
    if (val) {
      const iso = buildCustomISO(selDate, val);
      if (!iso || new Date(iso).getTime() <= Date.now() + 60 * 60 * 1000) {
        setCustomError("Must be at least 1 hour from now.");
      }
    }
  }

  const slots = availableSlotsFor(selDate, matchedAt);

  const previewISO = selSlot
    ? buildISO(selDate, selSlot)
    : customTime && !customError
      ? buildCustomISO(selDate, customTime)
      : null;

  return (
    <div className="space-y-5">
      {/* Day row */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">Day</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {dates.map((d, i) => {
            const hasTimes = availableSlotsFor(d, matchedAt).length > 0;
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
            onClick={() => onPropose(previewISO)}
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

export function ScheduleMatchPanel({
  challengeId,
  isHost,
  proposedMatchTime: initProposed,
  proposedByHost: initProposedByHost,
  scheduledAt: initScheduledAt,
  resultDeadlineAt: initDeadlineAt,
  resultWindowMinutes,
  matchedAt: matchedAtISO,
  opponentName,
}: Props) {
  // Fall back to now if matchedAt is unavailable (legacy challenges)
  const matchedAt = matchedAtISO ? new Date(matchedAtISO) : new Date();
  const [proposedMatchTime, setProposedMatchTime] = useState(initProposed);
  const [proposedByHost, setProposedByHost]       = useState(initProposedByHost);
  const [scheduledAt, setScheduledAt]             = useState(initScheduledAt);
  const [resultDeadlineAt, setResultDeadlineAt]   = useState(initDeadlineAt);
  const [showPicker, setShowPicker]               = useState(false);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState("");

  const hours = Math.floor(resultWindowMinutes / 60);
  const mins  = resultWindowMinutes % 60;
  const windowLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${resultWindowMinutes}m`;

  const iMadeProposal    = proposedMatchTime !== null &&
    ((isHost && proposedByHost === true) || (!isHost && proposedByHost === false));
  const theyMadeProposal = proposedMatchTime !== null && !iMadeProposal;

  async function apiCall(action: string, scheduledAt?: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/challenges/${challengeId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "propose" ? { action, scheduledAt } : { action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setError(j.error ?? "Something went wrong");
        return;
      }
      const { challenge } = await res.json() as {
        challenge: {
          proposedMatchTime: string | null;
          proposedByHost: boolean | null;
          scheduledAt: string | null;
          resultDeadlineAt: string | null;
        };
      };
      setProposedMatchTime(challenge.proposedMatchTime);
      setProposedByHost(challenge.proposedByHost);
      setScheduledAt(challenge.scheduledAt);
      setResultDeadlineAt(challenge.resultDeadlineAt);
      setShowPicker(false);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── STATE: Agreed ──────────────────────────────────────────────────────────
  if (scheduledAt) {
    return (
      <div className="rounded-2xl border border-neon-green/25 bg-neon-green/5 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-full bg-neon-green/20 border border-neon-green/30 flex items-center justify-center shrink-0">
            <CheckCircle size={15} className="text-neon-green" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neon-green">Match time agreed!</p>
            <p className="text-sm font-bold text-text-primary mt-0.5 truncate">{fmtFull(scheduledAt)}</p>
            {resultDeadlineAt && (
              <p className="text-[11px] text-text-muted mt-0.5">
                Submit result by {fmtShort(resultDeadlineAt)} ({windowLabel} window)
              </p>
            )}
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
            <p className="text-xs text-text-muted mb-4">Proposing a new time will require {opponentName} to accept again.</p>
            <TimePicker
              onPropose={iso => void apiCall("propose", iso)}
              loading={loading}
              error={error}
              matchedAt={matchedAt}
              ctaLabel="Propose new time"
            />
          </div>
        )}
      </div>
    );
  }

  // ── STATE: They proposed ───────────────────────────────────────────────────
  if (theyMadeProposal && proposedMatchTime) {
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
            <p className="text-base font-bold text-text-primary">{fmtFull(proposedMatchTime)}</p>
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
              matchedAt={matchedAt}
              ctaLabel="Send counter-proposal"
            />
          </div>
        )}

        {error && !showPicker && <p className="px-4 pb-3 text-xs text-neon-red">{error}</p>}
      </div>
    );
  }

  // ── STATE: I proposed, waiting ─────────────────────────────────────────────
  if (iMadeProposal && proposedMatchTime) {
    return (
      <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0 animate-pulse">
            <Clock size={15} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-yellow-400">Waiting for {opponentName}…</p>
            <p className="text-sm font-bold text-text-primary mt-0.5 truncate">{fmtFull(proposedMatchTime)}</p>
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
              matchedAt={matchedAt}
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
          Propose a time to play — {opponentName} must accept before you can exchange match codes.
          Results must be submitted within {windowLabel} after the agreed time.
        </p>
        <TimePicker
          onPropose={iso => void apiCall("propose", iso)}
          loading={loading}
          error={error}
          matchedAt={matchedAt}
          ctaLabel={`Propose to ${opponentName}`}
        />
      </div>
    </div>
  );
}
