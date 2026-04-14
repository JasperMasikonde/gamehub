"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PayoutRequestForm } from "./PayoutRequestForm";
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
  createdAt: string;
}

const txIcon: Record<WalletTxType, React.ReactNode> = {
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
        <div className="mt-4">
          {hasPendingPayout ? (
            <p className="text-xs text-neon-yellow flex items-center gap-1">
              <Clock size={12} /> A payout request is pending
            </p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPayoutForm((v) => !v)}
              disabled={(balance ?? 0) <= 0}
            >
              Request Payout
            </Button>
          )}
        </div>
      </div>

      {showPayoutForm && (
        <PayoutRequestForm
          balance={balance ?? 0}
          onSuccess={() => { setShowPayoutForm(false); void load(); }}
          onCancel={() => setShowPayoutForm(false)}
        />
      )}

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Payout Requests</h3>
          <div className="flex flex-col gap-2">
            {payouts.map((p) => {
              const badge = payoutStatusBadge[p.status];
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-text-primary font-medium">KES {Number(p.amount).toLocaleString()}</span>
                    <span className="text-text-muted text-xs">to {p.phone}</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${badge.color}`}>
                    {badge.icon} {badge.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Transaction History</h3>
          <div className="flex flex-col gap-3">
            {transactions.map((tx) => {
              const isCredit = ["CHALLENGE_WIN", "ADMIN_ADJUSTMENT", "SALE_CREDIT", "REFUND_CREDIT", "RANK_PUSH_CREDIT", "TOURNAMENT_WIN"].includes(tx.type);
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
