"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Smartphone, QrCode, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes before we give up polling
const SHOW_MANUAL_CHECK_AFTER_S = 15; // show "I've paid" button after this many seconds

interface Props {
  purpose: string;
  entityId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  /** Called when payment is confirmed COMPLETED */
  onSuccess: () => void;
  /** Optional link shown when confirmation times out so user can navigate back */
  returnUrl?: string;
  returnLabel?: string;
  /** Hide the QR code / bank alternative payment section */
  hideQrSection?: boolean;
}

type State = "idle" | "initiating" | "polling" | "success" | "failed" | "timed_out";

export function PaymentPanel({
  purpose,
  entityId,
  amount,
  currency = "KES",
  metadata,
  onSuccess,
  returnUrl,
  returnLabel = "Go back",
  hideQrSection = false,
}: Props) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [checking, setChecking] = useState(false);

  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed counter — only ticks while polling
  useEffect(() => {
    if (state === "polling") {
      setElapsed(0);
      elapsedTimer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = null; }
    }
    return () => { if (elapsedTimer.current) clearInterval(elapsedTimer.current); };
  }, [state]);

  // Clean up timers on unmount
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
      if (!res.ok) {
        if (res.status === 401) {
          setState("idle");
          setErrorMsg("__not_logged_in__");
          return;
        }
        setErrorMsg(data.error ?? "Failed to initiate payment");
        setState("idle");
        return;
      }

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

  async function poll(pid: string, manual = false) {
    if (!manual && pollCount.current >= MAX_POLLS) {
      // We timed out — but this is NOT a payment failure.
      // The payment may have gone through on M-Pesa; we just haven't received NCBA confirmation yet.
      setState("timed_out");
      return;
    }
    if (!manual) pollCount.current++;

    if (manual) setChecking(true);

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
        setFailureReason(data.reason ?? "Payment was declined by M-Pesa.");
        return;
      }
      // Still pending
      if (!manual) schedulePoll(pid);
    } catch {
      if (!manual) schedulePoll(pid);
    } finally {
      if (manual) setChecking(false);
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

  function reset() {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setState("idle");
    setErrorMsg("");
    setPaymentId(null);
    pollCount.current = 0;
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
        <CheckCircle size={40} className="text-neon-green" />
        <p className="font-bold text-neon-green text-lg">Payment confirmed!</p>
        <p className="text-xs text-text-muted">Your payment was received successfully.</p>
      </div>
    );
  }

  // ── Explicitly failed (M-Pesa declined / wrong PIN / cancelled) ────────────
  if (state === "failed") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <XCircle size={36} className="text-neon-red" />
          <p className="font-semibold text-neon-red">Payment declined</p>
          <p className="text-xs text-text-muted">{failureReason}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={reset}>
          Try again
        </Button>
      </div>
    );
  }

  // ── Timed out waiting for NCBA confirmation ────────────────────────────────
  if (state === "timed_out") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Loader2 size={36} className="text-neon-yellow" />
          <p className="font-semibold text-neon-yellow">Waiting for confirmation</p>
          <p className="text-xs text-text-muted leading-relaxed">
            Your M-Pesa payment went through but we haven&apos;t received confirmation from NCBA yet.
            This page will update automatically — you don&apos;t need to stay here.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {paymentId && (
            <Button
              variant="outline"
              className="w-full"
              disabled={checking}
              onClick={() => poll(paymentId, true)}
            >
              {checking
                ? <><Loader2 size={14} className="animate-spin" /> Checking…</>
                : <><RefreshCw size={14} /> Check again</>}
            </Button>
          )}
          {returnUrl && (
            <a href={returnUrl} className="w-full">
              <Button variant="primary" className="w-full">
                {returnLabel} <ArrowRight size={14} />
              </Button>
            </a>
          )}
          <Button variant="ghost" className="w-full text-text-muted" onClick={reset}>
            Start a new payment
          </Button>
        </div>
      </div>
    );
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  if (state === "polling") {
    const enteredPin = elapsed >= SHOW_MANUAL_CHECK_AFTER_S;
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Loader2 size={36} className="animate-spin text-neon-green" />
        <div>
          {enteredPin ? (
            <>
              <p className="font-semibold text-text-primary">Confirming your payment…</p>
              <p className="text-xs text-text-muted mt-1">
                Waiting for NCBA to confirm your transaction.
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
        <p className="text-xs text-text-muted tabular-nums">{elapsed}s</p>
        {enteredPin && paymentId && (
          <Button
            variant="outline"
            className="text-xs px-4 py-1.5 h-auto"
            disabled={checking}
            onClick={() => poll(paymentId, true)}
          >
            {checking
              ? <><Loader2 size={12} className="animate-spin" /> Checking…</>
              : <><RefreshCw size={12} /> I&apos;ve paid — check now</>}
          </Button>
        )}
      </div>
    );
  }

  // ── Idle / initiating ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="bg-neon-green/5 border border-neon-green/20 rounded-xl p-4 text-center">
        <p className="text-xs text-text-muted mb-1">Amount</p>
        <p className="text-3xl font-black text-neon-green">{formatCurrency(String(amount), currency)}</p>
      </div>

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
        {errorMsg === "__not_logged_in__" ? (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-neon-yellow/8 border border-neon-yellow/25 text-sm">
            <span className="text-neon-yellow shrink-0 mt-0.5">⚠</span>
            <span className="text-text-primary">
              You need to be logged in to pay.{" "}
              <Link href="/login" className="text-neon-blue underline underline-offset-2 font-semibold hover:text-neon-blue/80">
                Sign in
              </Link>
              {" "}or{" "}
              <Link href="/register" className="text-neon-blue underline underline-offset-2 font-semibold hover:text-neon-blue/80">
                create an account
              </Link>
              {" "}to continue.
            </span>
          </div>
        ) : errorMsg ? (
          <p className="text-xs text-neon-red">{errorMsg}</p>
        ) : null}
        <Button
          variant="primary"
          className="w-full glow-green"
          onClick={initiatePayment}
          disabled={state === "initiating"}
        >
          {state === "initiating"
            ? <><Loader2 size={15} className="animate-spin" /> Sending prompt…</>
            : <><Smartphone size={15} /> Send M-Pesa Prompt</>}
        </Button>
        <p className="text-xs text-text-muted text-center">
          You&apos;ll receive a pop-up on your phone. Enter your M-Pesa PIN to confirm.
        </p>
      </div>

      {!hideQrSection && (
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
                  src={qrCode}
                  alt="M-Pesa QR Code"
                  className="mx-auto max-w-[200px] rounded-xl border border-bg-border"
                />
              ) : (
                <p className="text-xs text-neon-red">Could not load QR code.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
