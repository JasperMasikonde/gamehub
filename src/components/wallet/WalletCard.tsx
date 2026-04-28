"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PayoutRequestForm } from "./PayoutRequestForm";
import { DepositPanel } from "./DepositPanel";
import type { WalletTxType, PayoutStatus } from "@prisma/client";

interface WalletTx {
  id: string;
  type: WalletTxType;
  amount: string;
  balanceAfter: string;
  description: string;
  createdAt: string;
}

interface PayoutRequest {
  id: string;
  amount: string;
  phone: string;
  status: PayoutStatus;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
}

const txIcon: Record<WalletTxType, React.ReactNode> = {
  DEPOSIT: <ArrowDownCircle size={15} className="text-neon-green" />,
  CHALLENGE_WIN: <ArrowDownCircle size={15} className="text-neon-green" />,
  CHALLENGE_WAGER: <ArrowUpCircle size={15} className="text-neon-red" />,
  PAYOUT: <ArrowUpCircle size={15} className="text-neon-yellow" />,
  ADMIN_ADJUSTMENT: <RefreshCw size={15} className="text-neon-blue" />,
  SALE_CREDIT: <ArrowDownCircle size={15} className="text-neon-green" />,
  REFUND_CREDIT: <ArrowDownCircle size={15} className="text-neon-blue" />,
  RANK_PUSH_CREDIT: <ArrowDownCircle size={15} className="text-neon-purple" />,
  TOURNAMENT_WIN: <ArrowDownCircle size={15} className="text-neon-yellow" />,
};

const payoutStatusBadge: Record<PayoutStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "Pending", color: "text-neon-yellow", icon: <Clock size={12} /> },
  APPROVED: { label: "Approved", color: "text-neon-blue", icon: <CheckCircle size={12} /> },
  PAID: { label: "Paid", color: "text-neon-green", icon: <CheckCircle size={12} /> },
  REJECTED: { label: "Rejected", color: "text-neon-red", icon: <XCircle size={12} /> },
};

export function WalletCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [showDepositPanel, setShowDepositPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [walletRes, payoutRes] = await Promise.all([
      fetch("/api/wallet"),
      fetch("/api/wallet/payout-request"),
    ]);
    if (walletRes.ok) {
      const data = await walletRes.json();
      setBalance(Number(data.balance));
      setTransactions(data.transactions ?? []);
    }
    if (payoutRes.ok) {
      const data = await payoutRes.json();
      setPayouts(data.requests ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasPendingPayout = payouts.some((p) => p.status === "PENDING");

  return (
    <div className="flex flex-col gap-4">
      {/* Balance card */}
      <div className="rounded-xl border border-neon-blue/30 bg-neon-blue/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <Wallet size={16} />
            <span>Wallet Balance</span>
          </div>
          <button onClick={() => void load()} className="text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="mt-2 text-3xl font-bold text-neon-blue">
          KES {balance?.toLocaleString("en-KE", { minimumFractionDigits: 2 }) ?? "0.00"}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => { setShowDepositPanel((v) => !v); setShowPayoutForm(false); }}
          >
            Deposit
          </Button>
          {hasPendingPayout ? (
            <p className="text-xs text-neon-yellow flex items-center gap-1 self-center">
              <Clock size={12} /> A payout request is pending
            </p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowPayoutForm((v) => !v); setShowDepositPanel(false); }}
              disabled={(balance ?? 0) <= 0}
            >
              Request Payout
            </Button>
          )}
        </div>
      </div>

      {showDepositPanel && (
        <DepositPanel
          onSuccess={() => { setShowDepositPanel(false); void load(); }}
          onCancel={() => setShowDepositPanel(false)}
        />
      )}

      {showPayoutForm && (
        <PayoutRequestForm
          balance={balance ?? 0}
          onSuccess={() => { setShowPayoutForm(false); void load(); }}
          onCancel={() => setShowPayoutForm(false)}
        />
      )}

      {/* Payout requests — status tracker */}
      {payouts.length > 0 && (
        <div className="rounded-xl border border-bg-border bg-bg-surface p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Payout Requests</h3>
          {payouts.map((p) => {
            const badge = payoutStatusBadge[p.status];
            const fmtDate = (d: string) =>
              new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

            const nextStep: Record<PayoutStatus, string> = {
              PENDING: "Your request is in the queue. We typically process payouts within 24 hours.",
              APPROVED: "Approved! Your M-Pesa payment is being sent shortly.",
              PAID: "Sent to your M-Pesa. Check your phone for the confirmation SMS.",
              REJECTED: "This request was not approved. See the note below for details.",
            };

            const borderColor: Record<PayoutStatus, string> = {
              PENDING: "border-neon-yellow/30 bg-neon-yellow/5",
              APPROVED: "border-neon-blue/30 bg-neon-blue/5",
              PAID: "border-neon-green/30 bg-neon-green/5",
              REJECTED: "border-neon-red/30 bg-neon-red/5",
            };

            return (
              <div key={p.id} className={`rounded-lg border p-3 flex flex-col gap-2 ${borderColor[p.status]}`}>
                {/* Top row: amount + status badge */}
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-text-primary">
                    KES {Number(p.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.color} border-current/20 bg-current/5`}>
                    {badge.icon} {badge.label}
                  </span>
                </div>

                {/* Details row */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-muted">
                  <span>M-Pesa: <span className="font-mono text-text-primary">{p.phone}</span></span>
                  <span>Requested: {fmtDate(p.createdAt)}</span>
                  {p.processedAt && <span>Processed: {fmtDate(p.processedAt)}</span>}
                </div>

                {/* Status message */}
                <p className={`text-xs ${badge.color}`}>{nextStep[p.status]}</p>

                {/* Admin note */}
                {p.adminNote && (
                  <div className="rounded-md bg-bg-elevated border border-bg-border px-3 py-2 text-xs text-text-muted">
                    <span className="font-medium text-text-primary">Note from admin: </span>
                    {p.adminNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Transaction History</h3>
          <div className="flex flex-col gap-3">
            {transactions.map((tx) => {
              const isCredit = ["DEPOSIT", "CHALLENGE_WIN", "ADMIN_ADJUSTMENT", "SALE_CREDIT", "REFUND_CREDIT", "RANK_PUSH_CREDIT", "TOURNAMENT_WIN"].includes(tx.type);
              return (
                <div key={tx.id} className="flex items-start gap-3">
                  <div className="mt-0.5">{txIcon[tx.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{tx.description}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(tx.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 ${isCredit ? "text-neon-green" : "text-neon-red"}`}>
                    {isCredit ? "+" : "−"}KES {Number(tx.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {transactions.length === 0 && (
        <p className="text-center text-sm text-text-muted py-4">No wallet transactions yet.</p>
      )}
    </div>
  );
}
