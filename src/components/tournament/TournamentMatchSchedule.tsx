"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Calendar, Clock, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  slug: string;
  matchId: string;
  isPlayer1: boolean;
  proposedMatchTime: string | null;
  proposedById: string | null;
  myId: string;
  scheduledAt: string | null;
  opponentName: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TournamentMatchSchedule({ slug, matchId, myId, proposedMatchTime: initProposed, proposedById: initProposedBy, scheduledAt: initScheduled, opponentName }: Props) {
  const [proposed, setProposed] = useState(initProposed);
  const [proposedBy, setProposedBy] = useState(initProposedBy);
  const [scheduled, setScheduled] = useState(initScheduled);
  const [input, setInput] = useState(() => initProposed ? toLocalInput(initProposed) : "");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const iMadeProposal = proposed !== null && proposedBy === myId;
  const theyMadeProposal = proposed !== null && proposedBy !== myId;

  async function call(action: string, time?: string) {
    setLoading(true); setError("");
    const res = await fetch(`/api/tournaments/${slug}/matches/${matchId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "propose" ? { action, scheduledAt: time } : { action }),
    });
    setLoading(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: string }; setError(j.error ?? "Failed"); return; }
    const { match } = await res.json() as { match: { proposedMatchTime: string | null; proposedById: string | null; scheduledAt: string | null } };
    setProposed(match.proposedMatchTime);
    setProposedBy(match.proposedById);
    setScheduled(match.scheduledAt);
    setShowForm(false); setInput("");
  }

  async function handlePropose() {
    if (!input) { setError("Pick a date and time"); return; }
    const d = new Date(input);
    if (isNaN(d.getTime()) || d <= new Date()) { setError("Must be in the future"); return; }
    await call("propose", d.toISOString());
  }

  const proposeForm = (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <input type="datetime-local" value={input} onChange={e => setInput(e.target.value)}
        className="px-3 py-1.5 text-sm bg-bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-neon-blue" />
      <Button size="sm" variant="secondary" onClick={() => void handlePropose()} loading={loading}>Propose</Button>
      <button onClick={() => setShowForm(false)} className="text-xs text-text-muted hover:text-text-primary underline">Cancel</button>
      {error && <p className="w-full text-xs text-neon-red">{error}</p>}
    </div>
  );

  // Agreed
  if (scheduled) {
    return (
      <div className="rounded-xl border border-neon-green/20 bg-neon-green/5 p-3">
        <p className="text-xs font-semibold text-neon-green flex items-center gap-1.5 mb-1"><CheckCircle size={12} /> Match time agreed</p>
        <p className="text-sm font-semibold text-text-primary">{fmt(scheduled)}</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-text-muted hover:text-text-primary underline flex items-center gap-1">
            <RotateCcw size={10} /> Propose different time
          </button>
        )}
        {showForm && proposeForm}
      </div>
    );
  }

  // I proposed
  if (iMadeProposal && proposed) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
        <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5 mb-1"><Clock size={12} /> Waiting for {opponentName}</p>
        <p className="text-sm font-semibold text-yellow-300">{fmt(proposed)}</p>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setInput(toLocalInput(proposed)); }} className="mt-2 text-xs text-text-muted hover:text-text-primary underline flex items-center gap-1">
            <RotateCcw size={10} /> Change time
          </button>
        )}
        {showForm && proposeForm}
      </div>
    );
  }

  // They proposed
  if (theyMadeProposal && proposed) {
    return (
      <div className="rounded-xl border border-neon-blue/20 bg-neon-blue/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-neon-blue flex items-center gap-1.5"><AlertCircle size={12} /> {opponentName} proposed</p>
        <p className="text-sm font-semibold text-text-primary">{fmt(proposed)}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => void call("accept")} loading={loading}>
            <CheckCircle size={12} /> Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(true)} disabled={loading}>Propose different</Button>
        </div>
        {showForm && proposeForm}
        {error && !showForm && <p className="text-xs text-neon-red">{error}</p>}
      </div>
    );
  }

  // No proposal yet
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-3">
      <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-1"><Calendar size={12} className="text-neon-blue" /> Agree on a match time</p>
      <p className="text-xs text-text-muted mb-3">Propose a time — your opponent must accept before you can share match codes.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="datetime-local" value={input} onChange={e => setInput(e.target.value)}
          className="px-3 py-1.5 text-sm bg-bg-base border border-border rounded-lg text-text-primary focus:outline-none focus:border-neon-blue" />
        <Button size="sm" variant="secondary" onClick={() => void handlePropose()} loading={loading}>Propose time</Button>
      </div>
      {error && <p className="text-xs text-neon-red mt-2">{error}</p>}
    </div>
  );
}
