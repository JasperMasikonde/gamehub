"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Trophy, Loader2, CheckCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils/format";

interface Props {
  completedAt: string;  // kept for compat but no longer drives a countdown
  payout: number;
  adminUserId: string;
  challengeId: string;
}

export function MatchCompletionBanner({ payout, challengeId }: Props) {
  const { socket } = useSocket();

  // Wallet balance — starts at payout (already credited), updates via socket
  const [balance, setBalance] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(payout.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [hasPending, setHasPending] = useState(false);

  // Fetch current wallet balance + pending status on mount
  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setBalance(Number(d.balance));
        // Do NOT override amount — keep it pre-filled to the challenge payout
      })
      .catch(() => {});

    fetch("/api/wallet/payout-request")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        const pending = (d.requests as { status: string }[]).some((r) => r.status === "PENDING");
        setHasPending(pending);
      })
      .catch(() => {});
  }, []);

  // Real-time balance updates via WebSocket
  useEffect(() => {
    if (!socket) return;
    const handler = ({ balance: b }: { balance: number }) => {
      setBalance(b);
      // Don't auto-update amount once user has edited it
    };
    socket.on("wallet_update", handler);
    return () => { socket.off("wallet_update", handler); };
  }, [socket]);

  async function requestPayout() {
    setError("");
    const amt = parseFloat(amount);
    if (!phone.trim()) { setError("Enter your M-Pesa phone number"); return; }
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    if (balance !== null && amt > balance) { setError(`Amount exceeds your wallet balance (KES ${balance.toFixed(2)})`); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/wallet/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, phone: phone.trim(), challengeId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit"); return; }
      setNewBalance(data.balance);
      setDone(true);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="rounded-xl p-4 border-2 border-neon-green/40 bg-neon-green/5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-neon-green shrink-0" />
          <div>
            <p className="font-bold text-neon-green text-sm">Payout request submitted!</p>
            <p className="text-xs text-text-muted mt-0.5">
              We&apos;ll send your M-Pesa payment shortly. Remaining wallet balance:{" "}
              <span className="font-semibold text-neon-green">
                KES {(newBalance ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Already has pending request ─────────────────────────────────────────
  if (hasPending) {
    return (
      <div className="rounded-xl p-4 border-2 border-neon-yellow/30 bg-neon-yellow/5 flex items-start gap-3">
        <Trophy size={20} className="text-neon-green shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-neon-green text-sm">You won! 🏆</p>
          <p className="text-xs text-text-muted mt-0.5">
            You have a payout request pending. We&apos;ll send your M-Pesa payment soon.
          </p>
          {balance !== null && (
            <div className="flex items-center gap-1.5 mt-2">
              <Wallet size={12} className="text-neon-green" />
              <span className="text-xs text-neon-green font-semibold">
                Wallet: KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main payout request form ─────────────────────────────────────────────
  return (
    <div className="rounded-xl p-4 border-2 border-neon-green/40 bg-neon-green/5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Trophy size={20} className="text-neon-green shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-neon-green text-sm">You won! 🏆 Request your payout</p>
          <p className="text-xs text-text-muted mt-0.5">
            Your winnings (<span className="font-semibold text-neon-green">{formatCurrency(payout.toString())}</span>) have been credited to your wallet.
            Fill in your M-Pesa details below to withdraw.
          </p>
        </div>
      </div>

      {/* Wallet balance */}
      {balance !== null && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neon-green/10 border border-neon-green/20">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Wallet size={12} /> Wallet balance
          </span>
          <span className="text-sm font-black text-neon-green">
            KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">M-Pesa phone number</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(""); }}
            placeholder="07XXXXXXXX"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">Amount to withdraw (KES)</label>
          <Input
            type="number"
            min={1}
            max={balance ?? undefined}
            step="0.01"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(""); }}
          />
          {balance !== null && (
            <button
              type="button"
              onClick={() => setAmount(balance.toFixed(2))}
              className="text-[11px] text-neon-green hover:underline mt-0.5"
            >
              Withdraw full balance
            </button>
          )}
        </div>

        {error && <p className="text-xs text-neon-red">{error}</p>}

        <Button
          variant="primary"
          className="w-full glow-green"
          onClick={requestPayout}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Submitting…</>
          ) : (
            <><Wallet size={14} /> Request Payout</>
          )}
        </Button>
        <p className="text-[11px] text-text-muted text-center">
          Your wallet balance will be deducted immediately. Payment is sent by admin via M-Pesa.
        </p>
      </div>
    </div>
  );
}
