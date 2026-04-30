"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Swords, Search, Loader2, X, CheckCircle, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface UserResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  balance: number;
  canAfford: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  BEST_OF_1: "Best of 1",
  BEST_OF_3: "Best of 3",
  BEST_OF_5: "Best of 5",
};

function UserPicker({
  label,
  color,
  selected,
  onSelect,
  onClear,
  excludeId,
  wager,
}: {
  label: string;
  color: string;
  selected: UserResult | null;
  onSelect: (u: UserResult) => void;
  onClear: () => void;
  excludeId?: string;
  wager: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: query, wager: String(wager) });
        if (excludeId) params.set("exclude", excludeId);
        const res = await fetch(`/api/admin/challenges/create?${params}`);
        const data = await res.json();
        setResults(data.users ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, wager, excludeId]);

  function pick(u: UserResult) {
    onSelect(u);
    setQuery("");
    setResults([]);
  }

  const borderColor = color === "purple" ? "border-neon-purple/40" : "border-neon-blue/40";
  const textColor = color === "purple" ? "text-neon-purple" : "text-neon-blue";
  const bgColor = color === "purple" ? "bg-neon-purple/10" : "bg-neon-blue/10";
  const avatarBg = color === "purple" ? "bg-neon-purple/10 border-neon-purple/20 text-neon-purple" : "bg-neon-blue/10 border-neon-blue/20 text-neon-blue";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${selected ? `${borderColor} ${bgColor}` : "border-bg-border bg-bg-elevated"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>{label}</p>

      {selected ? (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 text-sm font-bold uppercase overflow-hidden ${avatarBg}`}>
            {selected.avatarUrl
              ? <img src={selected.avatarUrl} alt="" className="w-full h-full object-cover" />
              : (selected.displayName ?? selected.username).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{selected.displayName ?? selected.username}</p>
            <p className="text-xs text-text-muted">@{selected.username}</p>
            <p className={`text-xs mt-0.5 ${selected.canAfford ? "text-neon-green" : "text-neon-red"}`}>
              Balance: KES {selected.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              {!selected.canAfford && " — insufficient"}
            </p>
          </div>
          <button onClick={onClear} className="text-text-muted hover:text-text-primary transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or display name…"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-bg-border bg-bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/60 transition-colors"
            />
            {searching && <Loader2 size={14} className="absolute right-3 animate-spin text-text-muted" />}
          </div>

          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-bg-border bg-bg-elevated shadow-xl overflow-hidden">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => pick(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-surface transition-colors text-left border-b border-bg-border last:border-0"
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold uppercase overflow-hidden ${avatarBg}`}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : (u.displayName ?? u.username).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{u.displayName ?? u.username}</p>
                    <p className="text-xs text-text-muted">@{u.username}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${u.canAfford ? "text-neon-green" : "text-neon-red"}`}>
                      KES {u.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-text-muted">{u.canAfford ? "can afford" : "insufficient"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-text-muted mt-2 text-center">No users found</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminCreateChallengePage() {
  const router = useRouter();

  const [host, setHost] = useState<UserResult | null>(null);
  const [challenger, setChallenger] = useState<UserResult | null>(null);
  const [format, setFormat] = useState<string>("BEST_OF_1");
  const [wager, setWager] = useState<string>("");
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wagerNum = parseFloat(wager) || 0;
  const canSubmit = host && challenger && wagerNum > 0 && host.canAfford && challenger.canAfford && confirmed;

  async function submit() {
    if (!host || !challenger || !canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: host.id,
          challengerId: challenger.id,
          format,
          wagerAmount: wagerNum,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create challenge"); setLoading(false); return; }
      router.push(`/admin/challenges/${data.challenge.id}`);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <Link href="/admin/challenges" className="text-xs text-text-muted hover:text-text-primary mb-2 inline-block">
          ← All Challenges
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Swords size={18} className="text-neon-purple" />
          Create Challenge
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Match two users into an active challenge. Both wallets are debited immediately.
        </p>
      </div>

      {/* Format & Wager */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-wide">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-bg-border bg-bg-elevated text-sm text-text-primary focus:outline-none focus:border-neon-purple/60 transition-colors"
          >
            {Object.entries(FORMAT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-wide">Wager Amount (KES)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={wager}
            onChange={(e) => { setWager(e.target.value); setConfirmed(false); }}
            placeholder="e.g. 100"
            className="w-full px-3 py-2.5 rounded-xl border border-bg-border bg-bg-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/60 transition-colors"
          />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text-primary uppercase tracking-wide">
          Description <span className="text-text-muted normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any notes about this challenge…"
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-bg-border bg-bg-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/60 transition-colors resize-none"
        />
      </div>

      {/* User pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UserPicker
          label="Host"
          color="purple"
          selected={host}
          onSelect={(u) => { setHost(u); setConfirmed(false); }}
          onClear={() => { setHost(null); setConfirmed(false); }}
          excludeId={challenger?.id}
          wager={wagerNum}
        />
        <UserPicker
          label="Challenger"
          color="blue"
          selected={challenger}
          onSelect={(u) => { setChallenger(u); setConfirmed(false); }}
          onClear={() => { setChallenger(null); setConfirmed(false); }}
          excludeId={host?.id}
          wager={wagerNum}
        />
      </div>

      {/* Summary & confirmation */}
      {host && challenger && wagerNum > 0 && (
        <div className={`rounded-xl border p-4 space-y-3 ${confirmed ? "border-neon-green/40 bg-neon-green/5" : "border-bg-border bg-bg-elevated"}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User size={14} className="text-text-muted" />
            <span className="text-neon-purple">{host.displayName ?? host.username}</span>
            <span className="text-text-muted">vs</span>
            <span className="text-neon-blue">{challenger.displayName ?? challenger.username}</span>
          </div>
          <div className="text-xs text-text-muted space-y-0.5">
            <p>Format: <span className="text-text-primary font-medium">{FORMAT_LABELS[format]}</span></p>
            <p>Wager each: <span className="text-neon-green font-semibold">KES {wagerNum.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></p>
            <p>Total debited: <span className="text-neon-yellow font-semibold">KES {(wagerNum * 2).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></p>
          </div>

          {(!host.canAfford || !challenger.canAfford) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-neon-red/10 border border-neon-red/20">
              <AlertTriangle size={13} className="text-neon-red shrink-0 mt-0.5" />
              <p className="text-xs text-neon-red">
                {!host.canAfford && `${host.displayName ?? host.username} has insufficient balance. `}
                {!challenger.canAfford && `${challenger.displayName ?? challenger.username} has insufficient balance.`}
              </p>
            </div>
          )}

          {host.canAfford && challenger.canAfford && (
            <div className="flex items-start gap-2.5">
              <input
                id="admin-challenge-confirm"
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-neon-green shrink-0 cursor-pointer"
              />
              <label htmlFor="admin-challenge-confirm" className="text-xs text-text-primary leading-relaxed cursor-pointer">
                I confirm both wallets will be debited{" "}
                <span className="font-semibold text-neon-green">KES {wagerNum.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>{" "}
                each and the challenge will start immediately as ACTIVE.
              </label>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button
        variant="primary"
        onClick={submit}
        loading={loading}
        disabled={!canSubmit}
        className="w-full sm:w-auto"
      >
        <CheckCircle size={14} />
        Create Challenge
      </Button>
    </div>
  );
}
