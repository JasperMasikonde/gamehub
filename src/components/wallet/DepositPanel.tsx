"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, XCircle, Smartphone, ArrowDownCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";

const MIN_DEPOSIT = 10;
const MAX_DEPOSIT = 70_000;
const POLL_INTERVAL = 3000;
const MAX_POLLS = 40; // ~2 min

type Stage = "form" | "initiating" | "polling" | "success" | "failed";

export function DepositPanel({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { data: session } = useSession();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [depositedAmount, setDepositedAmount] = useState(0);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (stage === "polling") {
      setElapsed(0);
      elapsedTimer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = null; }
    }
    return () => { if (elapsedTimer.current) clearInterval(elapsedTimer.current); };
  }, [stage]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, []);

  async function initiate() {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt < MIN_DEPOSIT) {
      setError(`Minimum deposit is KES ${MIN_DEPOSIT}`);
      return;
    }
    if (amt > MAX_DEPOSIT) {
      setError(`Maximum deposit is KES ${MAX_DEPOSIT.toLocaleString()}`);
      return;
    }
    if (!phone.trim()) {
      setError("Enter your M-Pesa phone number");
      return;
    }

    setError("");
    setDepositedAmount(amt);
    setStage("initiating");

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          amount: amt,
          purpose: "wallet_deposit",
          entityId: session?.user?.id ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to initiate deposit");
        setStage("form");
        return;
      }
      setPaymentId(data.paymentId);
      setStage("polling");
      pollCount.current = 0;
      schedulePoll(data.paymentId as string);
    } catch {
      setError("Network error — check your connection and try again");
      setStage("form");
    }
  }

  function schedulePoll(pid: string) {
    pollTimer.current = setTimeout(() => void poll(pid), POLL_INTERVAL);
  }

  async function poll(pid: string) {
    try {
      const res = await fetch(`/api/payments/${pid}/status`);
      const data = await res.json() as { status: string; reason?: string };

      if (data.status === "COMPLETED") {
        setStage("success");
        return;
      }
      if (data.status === "FAILED") {
        setStage("failed");
        setError(data.reason ?? "Payment was declined. Try again.");
        return;
      }

      pollCount.current++;
      if (pollCount.current >= MAX_POLLS) {
        setStage("failed");
        setError("Timed out waiting for confirmation. If you entered your PIN, your balance will update shortly — check back in a few minutes.");
        return;
      }
      schedulePoll(pid);
    } catch {
      pollCount.current++;
      if (pollCount.current < MAX_POLLS) schedulePoll(pid);
      else {
        setStage("failed");
        setError("Network error during confirmation. Check your wallet balance — payment may have gone through.");
      }
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (stage === "success") {
    return (
      <div className="rounded-xl border border-neon-green/30 bg-neon-green/5 p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center">
          <CheckCircle size={28} className="text-neon-green" />
        </div>
        <div>
          <p className="font-bold text-neon-green text-lg">Deposit confirmed!</p>
          <p className="text-sm text-text-muted mt-1">
            <span className="font-semibold text-text-primary">
              KES {depositedAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </span>{" "}
            has been added to your wallet.
          </p>
        </div>
        <Button variant="primary" className="w-full" onClick={onSuccess}>
          Done
        </Button>
      </div>
    );
  }

  // ── Failed ─────────────────────────────────────────────────────────────────
  if (stage === "failed") {
    return (
      <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-neon-red/20 border border-neon-red/40 flex items-center justify-center">
          <XCircle size={28} className="text-neon-red" />
        </div>
        <div>
          <p className="font-bold text-neon-red">Deposit failed</p>
          <p className="text-sm text-text-muted mt-1">{error}</p>
        </div>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={() => { setStage("form"); setError(""); }}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  if (stage === "polling" || stage === "initiating") {
    return (
      <div className="rounded-xl border border-neon-blue/30 bg-neon-blue/5 p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-neon-blue/20 border border-neon-blue/40 flex items-center justify-center">
          {stage === "initiating"
            ? <Loader2 size={26} className="text-neon-blue animate-spin" />
            : <Smartphone size={26} className="text-neon-blue" />}
        </div>
        <div>
          <p className="font-bold text-neon-blue text-sm">
            {stage === "initiating" ? "Sending STK push…" : "Check your phone"}
          </p>
          {stage === "polling" && (
            <>
              <p className="text-sm text-text-muted mt-1">
                Enter your M-Pesa PIN to deposit{" "}
                <span className="font-semibold text-text-primary">
                  KES {depositedAmount.toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-text-muted/60 mt-2 tabular-nums">
                Waiting… {elapsed}s
              </p>
            </>
          )}
        </div>
        {stage === "polling" && (
          <button
            onClick={() => paymentId && void poll(paymentId)}
            className="text-xs text-neon-blue underline"
          >
            I&apos;ve entered my PIN — check now
          </button>
        )}
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-neon-green/30 bg-neon-green/5 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownCircle size={16} className="text-neon-green" />
          <p className="text-sm font-semibold text-text-primary">Deposit via M-Pesa</p>
        </div>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">Amount (KES)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium pointer-events-none">KSh</span>
            <input
              type="number"
              min={MIN_DEPOSIT}
              max={MAX_DEPOSIT}
              step="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              placeholder="0"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-bg-border bg-bg-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-green/60 transition-colors"
            />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Min KES {MIN_DEPOSIT} · Max KES {MAX_DEPOSIT.toLocaleString()}
          </p>
          {/* Quick amounts */}
          <div className="flex gap-2 mt-2">
            {[100, 200, 500, 1000].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setAmount(String(q)); setError(""); }}
                className="flex-1 py-1.5 rounded-lg border border-bg-border bg-bg-elevated text-xs font-medium text-text-muted hover:border-neon-green/40 hover:text-neon-green transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">M-Pesa phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(""); }}
            placeholder="07XXXXXXXX"
            className="w-full px-4 py-3 rounded-xl border border-bg-border bg-bg-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-green/60 transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-neon-red bg-neon-red/5 border border-neon-red/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button variant="primary" className="w-full" onClick={() => void initiate()}>
        <Smartphone size={15} />
        Deposit via M-Pesa
      </Button>

      <p className="text-[11px] text-text-muted text-center leading-relaxed">
        You&apos;ll receive an M-Pesa prompt on your phone. Enter your PIN to complete the deposit.
      </p>
    </div>
  );
}
