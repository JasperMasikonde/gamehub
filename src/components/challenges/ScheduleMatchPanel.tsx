"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Calendar, Clock, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  challengeId: string;
  isHost: boolean;
  proposedMatchTime: string | null;
  proposedByHost: boolean | null;
  scheduledAt: string | null;
  resultDeadlineAt: string | null;
  resultWindowMinutes: number;
  opponentName: string;
}

function formatLocal(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [proposedByHost, setProposedByHost] = useState(initProposedByHost);
  const [scheduledAt, setScheduledAt] = useState(initScheduledAt);
  const [resultDeadlineAt, setResultDeadlineAt] = useState(initDeadlineAt);
  const [inputValue, setInputValue] = useState(() =>
    initProposed ? toDatetimeLocalValue(initProposed) : ""
  );
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hours = Math.floor(resultWindowMinutes / 60);
  const mins = resultWindowMinutes % 60;
  const windowLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${resultWindowMinutes}m`;

  const iMadeProposal = proposedMatchTime !== null &&
    ((isHost && proposedByHost === true) || (!isHost && proposedByHost === false));
  const theyMadeProposal = proposedMatchTime !== null && !iMadeProposal;

  const api = async (action: string, scheduledAt?: string) => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/challenges/${challengeId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "propose" ? { action, scheduledAt } : { action }),
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "Something went wrong");
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
    setShowProposeForm(false);
    setInputValue("");
  };

  const handlePropose = async () => {
    if (!inputValue) { setError("Pick a date and time"); return; }
    const date = new Date(inputValue);
    if (isNaN(date.getTime()) || date <= new Date()) {
      setError("Proposed time must be in the future");
      return;
    }
    await api("propose", date.toISOString());
  };

  // ── State: agreed ───────────────────────────────────────────────────────
  if (scheduledAt) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle size={14} className="text-neon-green" />
            Match Time Agreed
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={13} className="text-neon-green shrink-0" />
              <span className="text-text-primary font-semibold">{formatLocal(scheduledAt)}</span>
            </div>
            {resultDeadlineAt && (
              <p className="text-xs text-text-muted">
                Results must be submitted by{" "}
                <span className="text-neon-yellow font-medium">{formatLocal(resultDeadlineAt)}</span>
                {" "}({windowLabel} window)
              </p>
            )}
          </div>

          {/* Allow re-proposing to change the time */}
          {!showProposeForm && (
            <button
              onClick={() => setShowProposeForm(true)}
              className="mt-3 text-xs text-text-muted hover:text-text-primary underline flex items-center gap-1"
            >
              <RotateCcw size={11} />
              Propose a different time
            </button>
          )}

          {showProposeForm && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-text-muted">Propose a new time (the other player will need to accept again):</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-neon-blue"
                />
                <Button size="sm" variant="secondary" onClick={() => void handlePropose()} loading={loading}>
                  Propose
                </Button>
                <button onClick={() => setShowProposeForm(false)} className="text-xs text-text-muted hover:text-text-primary underline">
                  Cancel
                </button>
              </div>
              {error && <p className="text-xs text-neon-red">{error}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── State: I proposed, waiting for opponent ─────────────────────────────
  if (iMadeProposal && proposedMatchTime) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock size={14} className="text-neon-yellow" />
            Waiting for {opponentName}
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted mb-1">You proposed:</p>
          <p className="text-sm font-semibold text-neon-yellow">{formatLocal(proposedMatchTime)}</p>
          <p className="text-xs text-text-muted mt-2">
            {opponentName} needs to accept before you can exchange match codes.
          </p>

          {/* Allow changing proposal */}
          {!showProposeForm && (
            <button
              onClick={() => { setShowProposeForm(true); setInputValue(toDatetimeLocalValue(proposedMatchTime)); }}
              className="mt-3 text-xs text-text-muted hover:text-text-primary underline flex items-center gap-1"
            >
              <RotateCcw size={11} />
              Change proposed time
            </button>
          )}

          {showProposeForm && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-neon-blue"
                />
                <Button size="sm" variant="secondary" onClick={() => void handlePropose()} loading={loading}>
                  Update
                </Button>
                <button onClick={() => setShowProposeForm(false)} className="text-xs text-text-muted hover:text-text-primary underline">
                  Cancel
                </button>
              </div>
              {error && <p className="text-xs text-neon-red">{error}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── State: opponent proposed, I need to respond ─────────────────────────
  if (theyMadeProposal && proposedMatchTime) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="text-neon-blue" />
            {opponentName} Proposed a Match Time
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-neon-blue mb-1">{formatLocal(proposedMatchTime)}</p>
          <p className="text-xs text-text-muted mb-4">Accept to unlock the match code chat, or propose a different time.</p>

          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => void api("accept")}
              loading={loading}
            >
              <CheckCircle size={13} />
              Accept this time
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowProposeForm(true); setInputValue(""); }}
              disabled={loading}
            >
              Propose different time
            </Button>
          </div>

          {showProposeForm && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-neon-blue"
                />
                <Button size="sm" variant="secondary" onClick={() => void handlePropose()} loading={loading}>
                  Propose
                </Button>
                <button onClick={() => setShowProposeForm(false)} className="text-xs text-text-muted hover:text-text-primary underline">
                  Cancel
                </button>
              </div>
              {error && <p className="text-xs text-neon-red">{error}</p>}
            </div>
          )}
          {error && !showProposeForm && <p className="text-xs text-neon-red mt-2">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  // ── State: no proposal yet ──────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Calendar size={14} className="text-neon-blue" />
          Agree on a Match Time
        </h2>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-text-muted mb-3">
          Propose a time to play. Your opponent must accept before you can exchange match codes.
          Results must be submitted within {windowLabel} after the agreed time.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="datetime-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="px-3 py-1.5 text-sm bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-neon-blue"
          />
          <Button size="sm" variant="secondary" onClick={() => void handlePropose()} loading={loading}>
            Propose time
          </Button>
        </div>
        {error && <p className="text-xs text-neon-red mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
