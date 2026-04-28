"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";

interface Props {
  challengeId: string;
  wagerAmount: number;
  role: "host" | "challenger";
  challengerSquadUrl?: string;
  whatsappNumber?: string;
  onSuccess: () => void;
}

export function WalletPayButton({ challengeId, wagerAmount, role, challengerSquadUrl, whatsappNumber, onSuccess }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setBalance(Number(d.balance)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasSufficientBalance = (balance ?? 0) >= wagerAmount;

  const handlePay = async () => {
    setPaying(true);
    setError("");
    const body: Record<string, unknown> = { role };
    if (role === "challenger" && challengerSquadUrl) body.challengerSquadUrl = challengerSquadUrl;
    if (whatsappNumber) body.whatsappNumber = whatsappNumber;

    try {
      const res = await fetch(`/api/challenges/${challengeId}/pay-from-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setDone(true);
        onSuccess();
      } else if (res.status === 401) {
        setError("__not_logged_in__");
      } else {
        const json = await res.json().catch(() => ({})) as { error?: string };
        // Re-fetch balance in case it changed since the page loaded
        if (res.status === 400) {
          fetch("/api/wallet")
            .then(r => r.ok ? r.json() : null)
            .then(d => d && setBalance(Number(d.balance)))
            .catch(() => {});
        }
        setError(json.error ?? "Payment failed. Please try again.");
      }
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 size={13} className="animate-spin" />
        Checking wallet balance…
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-neon-green">
        <CheckCircle size={14} />
        Paid from wallet!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <Wallet size={12} />
          Wallet balance
        </span>
        <span className={hasSufficientBalance ? "text-neon-green font-medium" : "text-neon-red font-medium"}>
          {formatCurrency(String(balance ?? 0))}
        </span>
      </div>

      {error === "__not_logged_in__" ? (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-neon-yellow/8 border border-neon-yellow/25 text-sm">
          <span className="text-neon-yellow shrink-0 mt-0.5">⚠</span>
          <span className="text-text-primary">
            You need to be logged in.{" "}
            <Link href="/login" className="text-neon-blue underline underline-offset-2 font-semibold hover:text-neon-blue/80">
              Sign in
            </Link>
            {" "}to continue.
          </span>
        </div>
      ) : error ? (
        <p className="text-xs text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{error}</p>
      ) : null}

      <Button
        variant="outline"
        className="w-full border-neon-blue/40 text-neon-blue hover:bg-neon-blue/10"
        onClick={() => void handlePay()}
        loading={paying}
        disabled={!hasSufficientBalance || paying}
      >
        <Wallet size={14} />
        {hasSufficientBalance
          ? `Pay ${formatCurrency(String(wagerAmount))} from Wallet`
          : `Insufficient balance (need ${formatCurrency(String(wagerAmount))})`}
      </Button>
    </div>
  );
}
