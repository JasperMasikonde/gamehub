"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

interface Tx {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export function AdminWalletAdjustPanel({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function loadWallet() {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/admin/wallet/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setTransactions(data.transactions);
      }
    } catch { /* ignore */ }
    finally { setLoadingData(false); }
  }

  useEffect(() => { loadWallet(); }, [userId]);

  async function submit() {
    setError("");
    setSaved(false);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    if (note.trim().length < 3) { setError("Note must be at least 3 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/wallet/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: amt, note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setBalance(data.balance);
      setAmount("");
      setNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Reload transaction history
      loadWallet();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-neon-blue/20 bg-neon-blue/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-neon-blue" />
          <h3 className="text-sm font-semibold">Wallet: <span className="text-text-muted font-normal">@{username}</span></h3>
        </div>
        {loadingData ? (
          <Loader2 size={14} className="animate-spin text-text-muted" />
        ) : (
          <span className="text-lg font-black text-neon-green">
            KES {(balance ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Credit / Debit toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setType("credit")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            type === "credit"
              ? "border-neon-green bg-neon-green/10 text-neon-green"
              : "border-bg-border text-text-muted hover:text-text-primary"
          )}
        >
          <TrendingUp size={12} /> Add funds
        </button>
        <button
          onClick={() => setType("debit")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            type === "debit"
              ? "border-neon-red bg-neon-red/10 text-neon-red"
              : "border-bg-border text-text-muted hover:text-text-primary"
          )}
        >
          <TrendingDown size={12} /> Deduct funds
        </button>
      </div>

      <div className="space-y-2">
        <Input
          type="number"
          min={1}
          step="0.01"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(""); setSaved(false); }}
          placeholder="Amount (KES)"
        />
        <Input
          type="text"
          value={note}
          onChange={(e) => { setNote(e.target.value); setError(""); setSaved(false); }}
          placeholder="Reason / note (required)"
          maxLength={300}
        />
      </div>

      {error && <p className="text-xs text-neon-red">{error}</p>}
      {saved && <p className="text-xs text-neon-green flex items-center gap-1"><CheckCircle size={12} /> Done — user notified in real-time.</p>}

      <Button
        variant={type === "credit" ? "primary" : "outline"}
        className={cn("w-full", type === "debit" && "border-neon-red/40 text-neon-red hover:bg-neon-red/10")}
        onClick={submit}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Processing…</>
        ) : type === "credit" ? (
          <><TrendingUp size={14} /> Add to wallet</>
        ) : (
          <><TrendingDown size={14} /> Deduct from wallet</>
        )}
      </Button>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-bg-border">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2">Recent transactions</p>
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs gap-2">
              <span className="text-text-muted truncate flex-1">{t.description}</span>
              <span className={cn(
                "font-semibold shrink-0",
                ["CHALLENGE_WIN", "ADMIN_ADJUSTMENT"].includes(t.type) && t.description.includes("credit")
                  ? "text-neon-green"
                  : t.type === "CHALLENGE_WIN"
                  ? "text-neon-green"
                  : "text-neon-red"
              )}>
                KES {t.amount.toFixed(2)}
              </span>
              <span className="text-text-muted shrink-0 font-mono text-[10px]">
                → {t.balanceAfter.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
