"use client";

import { useState, useEffect, useRef } from "react";
import { Smartphone, QrCode, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";

const CONFIRM_PHASE_AFTER_S = 20; // switch message after PIN entry window

interface Props {
  /** Payment purpose: "escrow" | "challenge" | "tournament" | "shop" */
  purpose: string;
  /** The entity being paid for (transactionId / challengeId / tournamentId / orderId) */
  entityId: string;
  /** Amount in KES */
  amount: number;
  currency?: string;
  /** Extra metadata passed to the server (e.g. challengerSquadUrl) */
  metadata?: Record<string, unknown>;
  /** Called when payment is confirmed */
  onSuccess: () => void;
}

type State = "idle" | "initiating" | "polling" | "success" | "failed";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

export function PaymentPanel({ purpose, entityId, amount, currency = "KES", metadata, onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed timer — runs only while polling
  useEffect(() => {
    if (state === "polling") {
      setElapsed(0);
      elapsedTimer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = null; }
    }
    return () => { if (elapsedTimer.current) clearInterval(elapsedTimer.current); };
  }, [state]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, []);

  async function initiatePayment() {
    const rawPhone = phone.trim();
    if (!rawPhone) { setErrorMsg("Enter your M-Pesa phone number"); return; }

    setState("initiating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: rawPhone, amount, purpose, entityId, metadata }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Failed to initiate payment"); setState("idle"); return; }

      setPaymentId(data.paymentId);
      setState("polling");
      pollCount.current = 0;
      schedulePoll(data.paymentId);
    } catch {
      setErrorMsg("Network error. Check your connection.");
      setState("idle");
    }
  }

  function schedulePoll(pid: string) {
    pollTimer.current = setTimeout(() => poll(pid), POLL_INTERVAL_MS);
  }

  async function poll(pid: string) {
    if (pollCount.current >= MAX_POLLS) {
      setState("failed");
      setFailureReason("Payment timed out. Please try again.");
      return;
    }
    pollCount.current++;

    try {
      const res = await fetch(`/api/payments/${pid}/status`);
      const data = await res.json();

      if (data.status === "COMPLETED") {
        setState("success");
        onSuccess();
        return;
      }
      if (data.status === "FAILED") {
        setState("failed");
        setFailureReason(data.reason ?? "Payment was declined.");
        return;
      }
      // Still pending — keep polling
      schedulePoll(pid);
    } catch {
      // Network glitch — retry
      schedulePoll(pid);
    }
  }

  async function loadQR() {
    setQrLoading(true);
    try {
      const res = await fetch("/api/payments/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, narration: `Eshabiki ${purpose}` }),
      });
      const data = await res.json();
      if (data.qrCode) setQrCode(data.qrCode);
    } catch { /* silent */ }
    finally { setQrLoading(false); }
  }

  function toggleQR() {
    const next = !showQR;
    setShowQR(next);
    if (next && !qrCode) loadQR();
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
        <CheckCircle size={40} className="text-neon-green" />
        <p className="font-bold text-neon-green text-lg">Payment confirmed!</p>
        <p className="text-xs text-text-muted">Your payment was received successfully.</p>
      </div>
    );
  }

  // ── Failed state ───────────────────────────────────────────────────────────
  if (state === "failed") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <XCircle size={36} className="text-neon-red" />
          <p className="font-semibold text-neon-red">Payment failed</p>
          <p className="text-xs text-text-muted">{failureReason}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => { setState("idle"); setErrorMsg(""); setPaymentId(null); }}>
          Try again
        </Button>
      </div>
    );
  }

  // ── Polling state ──────────────────────────────────────────────────────────
  if (state === "polling") {
    const confirming = elapsed >= CONFIRM_PHASE_AFTER_S;
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Loader2 size={36} className="animate-spin text-neon-green" />
        <div>
          {confirming ? (
            <>
              <p className="font-semibold text-text-primary">Confirming your payment…</p>
              <p className="text-xs text-text-muted mt-1">
                We&apos;re waiting for NCBA to confirm the transaction. This can take a few seconds.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-text-primary">Check your phone</p>
              <p className="text-xs text-text-muted mt-1">
                An M-Pesa prompt has been sent to{" "}
                <span className="font-medium text-text-primary">{phone}</span>.
                Enter your PIN to complete payment.
              </p>
            </>
          )}
        </div>
        <p className="text-xs text-text-muted tabular-nums">{elapsed}s elapsed</p>
      </div>
    );
  }

  // ── Idle / initiating ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Amount display */}
      <div className="bg-neon-green/5 border border-neon-green/20 rounded-xl p-4 text-center">
        <p className="text-xs text-text-muted mb-1">Amount</p>
        <p className="text-3xl font-black text-neon-green">{formatCurrency(String(amount), currency)}</p>
      </div>

      {/* STK Push section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-neon-green" />
          <p className="text-sm font-semibold">Pay via M-Pesa STK Push</p>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">M-Pesa phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); setErrorMsg(""); }}
            placeholder="07XXXXXXXX"
            className="w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-green/50 transition-colors"
          />
        </div>
        {errorMsg && <p className="text-xs text-neon-red">{errorMsg}</p>}
        <Button
          variant="primary"
          className="w-full glow-green"
          onClick={initiatePayment}
          disabled={state === "initiating"}
        >
          {state === "initiating"
            ? <><Loader2 size={15} className="animate-spin" /> Sending prompt…</>
            : <><Smartphone size={15} /> Send M-Pesa Prompt</>
          }
        </Button>
        <p className="text-xs text-text-muted text-center">You&apos;ll receive a pop-up on your phone. Enter your M-Pesa PIN to confirm.</p>
      </div>

      {/* QR Code accordion */}
      <div className="border border-bg-border rounded-xl overflow-hidden">
        <button
          onClick={toggleQR}
          className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-elevated transition-colors"
        >
          <span className="flex items-center gap-2 text-text-muted font-medium">
            <QrCode size={14} /> Pay via QR Code (alternative)
          </span>
          {showQR ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>
        {showQR && (
          <div className="px-4 pb-4 space-y-3 border-t border-bg-border">
            <p className="text-xs text-text-muted pt-3">Scan this QR code with your M-Pesa app to pay.</p>
            {qrLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-text-muted" /></div>
            ) : qrCode ? (
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="M-Pesa QR Code"
                className="mx-auto max-w-[200px] rounded-xl border border-bg-border"
              />
            ) : (
              <p className="text-xs text-neon-red">Could not load QR code.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
