"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Search, AlertTriangle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UserResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  balance: number;
  canAfford: boolean;
}

interface Props {
  challengeId: string;
  wagerAmount: string;
}

export function ChallengeForceMatchPanel({ challengeId, wagerAmount }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/challenges/${challengeId}/force-match?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.users ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, challengeId]);

  function select(user: UserResult) {
    setSelected(user);
    setQuery("");
    setResults([]);
    setConfirm(false);
    setError("");
  }

  function clear() {
    setSelected(null);
    setConfirm(false);
    setError("");
  }

  async function match() {
    if (!selected) return;
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/challenges/${challengeId}/force-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to match"); setLoading(false); return; }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="border border-neon-blue/30 bg-neon-blue/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="text-neon-blue" />
        <h3 className="text-sm font-semibold text-neon-blue">Force-Match Challenger</h3>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        Search for any active user with at least{" "}
        <span className="font-semibold text-text-primary">KES {wagerAmount}</span> in their wallet.
        Their wager will be debited and the challenge will become ACTIVE.
      </p>

      {/* User search */}
      {!selected && (
        <div className="relative">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or display name…"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-bg-border bg-bg-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/60 transition-colors"
            />
            {searching && <Loader2 size={14} className="absolute right-3 animate-spin text-text-muted" />}
          </div>

          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-bg-border bg-bg-elevated shadow-xl overflow-hidden">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => u.canAfford && select(u)}
                  disabled={!u.canAfford}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left border-b border-bg-border last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shrink-0 text-xs font-bold text-neon-blue uppercase overflow-hidden">
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : (u.displayName ?? u.username).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {u.displayName ?? u.username}
                    </p>
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

      {/* Selected user confirmation */}
      {selected && (
        <div className="rounded-xl border border-neon-blue/30 bg-neon-blue/10 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neon-blue/20 border border-neon-blue/30 flex items-center justify-center shrink-0 text-sm font-bold text-neon-blue uppercase overflow-hidden">
            {selected.avatarUrl
              ? <img src={selected.avatarUrl} alt="" className="w-full h-full object-cover" />
              : (selected.displayName ?? selected.username).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{selected.displayName ?? selected.username}</p>
            <p className="text-xs text-text-muted">@{selected.username}</p>
            <p className="text-xs text-neon-green mt-0.5">
              Balance: KES {selected.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={clear} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {confirm && selected && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
          <AlertTriangle size={14} className="text-neon-blue shrink-0 mt-0.5" />
          <p className="text-xs text-neon-blue">
            KES {wagerAmount} will be debited from {selected.displayName ?? selected.username}&apos;s wallet
            and the challenge will become ACTIVE. Click again to confirm.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-neon-red">{error}</p>}

      {selected && (
        <Button
          variant="outline"
          className="border-neon-blue/40 text-neon-blue hover:bg-neon-blue/10"
          onClick={match}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Matching…</>
          ) : confirm ? (
            <><CheckCircle size={14} /> Confirm match</>
          ) : (
            <><UserPlus size={14} /> Match {selected.displayName ?? selected.username}</>
          )}
        </Button>
      )}
    </div>
  );
}
