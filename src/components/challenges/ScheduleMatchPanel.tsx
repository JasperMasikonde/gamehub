"use client";

import { useState, useEffect } from "react";
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

// ── Time picker — datetime-local within 12 hrs ────────────────────────────────

interface PickerProps {
  onPropose: (iso: string) => void;
  loading: boolean;
  error: string;
  ctaLabel?: string;
}

function toLocalDatetimeValue(d: Date): string {
  // Format: YYYY-MM-DDTHH:MM (local time, no timezone) for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TimePicker({ onPropose, loading, error, ctaLabel = "Propose this time" }: PickerProps) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState("");

  const minDate = new Date(Date.now() + 5 * 60 * 1000);       // 5 min from now
  const maxDate = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hrs from now
  const minStr = toLocalDatetimeValue(minDate);
  const maxStr = toLocalDatetimeValue(maxDate);

  function handleChange(val: string) {
    setValue(val);
    setLocalError("");
    if (!val) return;
    const selected = new Date(val);
    if (selected <= new Date()) {
      setLocalError("That time has already passed.");
    } else if (selected > maxDate) {
      setLocalError("Must be within the next 12 hours.");
    }
  }

  const canSubmit = !!value && !localError;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-text-muted mb-2 leading-relaxed">
          Pick any time within the next <span className="font-semibold text-text-primary">12 hours</span>.
        </p>
        <input
          type="datetime-local"
          value={value}
          onChange={e => handleChange(e.target.value)}
          min={minStr}
          max={maxStr}
          className={cn(
            "w-full px-4 py-3.5 rounded-2xl border bg-bg-elevated text-sm font-semibold text-text-primary",
            "focus:outline-none transition-colors",
            localError
              ? "border-neon-red"
              : value && !localError
              ? "border-neon-green text-neon-green"
              : "border-bg-border focus:border-neon-green/60"
          )}
        />
        {localError && (
          <p className="mt-1.5 text-xs text-neon-red">{localError}</p>
        )}
        {!localError && !value && (
          <p className="mt-1.5 text-xs text-text-muted/60">
            Up to {fmtShort(maxDate.toISOString())}
          </p>
        )}
      </div>

      {canSubmit && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-bg-surface border border-bg-border">
            <Clock size={13} className="text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">
              {fmtShort(new Date(value).toISOString())}
            </span>
          </div>
          <Button
            className="w-full h-12 text-sm font-bold glow-green"
            variant="primary"
            onClick={() => onPropose(new Date(value).toISOString())}
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
  opponentName,
}: Props) {
  const [proposedMatchTime, setProposedMatchTime] = useState(initProposed);
  const [proposedByHost, setProposedByHost]       = useState(initProposedByHost);
  const [scheduledAt, setScheduledAt]             = useState(initScheduledAt);
  const [resultDeadlineAt, setResultDeadlineAt]   = useState(initDeadlineAt);
  const [showPicker, setShowPicker]               = useState(false);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState("");

  // Sync state when server pushes fresh props via router.refresh()
  useEffect(() => {
    setProposedMatchTime(initProposed);
    setProposedByHost(initProposedByHost);
    setScheduledAt(initScheduledAt);
    setResultDeadlineAt(initDeadlineAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initProposed, initProposedByHost, initScheduledAt, initDeadlineAt]);

  const hours = Math.floor(resultWindowMinutes / 60);
  const mins  = resultWindowMinutes % 60;
  const windowLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${resultWindowMinutes}m`;

  const iMadeProposal    = proposedMatchTime !== null &&
    ((isHost && proposedByHost === true) || (!isHost && proposedByHost === false));
  const theyMadeProposal = proposedMatchTime !== null && !iMadeProposal;

  async function apiCall(action: string, iso?: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/challenges/${challengeId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "propose" ? { action, scheduledAt: iso } : { action }),
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
            <p className="text-xs text-text-muted mb-4">
              Proposing a new time will require {opponentName} to accept again.
            </p>
            <TimePicker
              onPropose={iso => void apiCall("propose", iso)}
              loading={loading}
              error={error}
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
          ctaLabel={`Propose to ${opponentName}`}
        />
      </div>
    </div>
  );
}
