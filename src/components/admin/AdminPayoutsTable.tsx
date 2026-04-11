"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, DollarSign, Loader2, ChevronDown } from "lucide-react";
import type { PayoutStatus } from "@prisma/client";

interface PayoutUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface SerializedPayoutRequest {
  id: string;
  amount: string;
  phone: string;
  status: PayoutStatus;
  adminNote: string | null;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: PayoutUser;
}

const statusConfig: Record<PayoutStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "Pending", color: "text-neon-yellow bg-neon-yellow/10 border-neon-yellow/30", icon: <Clock size={11} /> },
  APPROVED: { label: "Approved", color: "text-neon-blue bg-neon-blue/10 border-neon-blue/30", icon: <CheckCircle size={11} /> },
  PAID: { label: "Paid", color: "text-neon-green bg-neon-green/10 border-neon-green/30", icon: <CheckCircle size={11} /> },
  REJECTED: { label: "Rejected", color: "text-neon-red bg-neon-red/10 border-neon-red/30", icon: <XCircle size={11} /> },
};

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant: "approve" | "paid" | "reject";
}) {
  const colors = {
    approve: "border-neon-blue text-neon-blue hover:bg-neon-blue/10",
    paid: "border-neon-green text-neon-green hover:bg-neon-green/10",
    reject: "border-neon-red text-neon-red hover:bg-neon-red/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${colors[variant]}`}
    >
      {label}
    </button>
  );
}

export function AdminPayoutsTable({ initialRequests }: { initialRequests: SerializedPayoutRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "ALL">("ALL");

  const act = async (id: string, action: "approve" | "reject" | "mark_paid") => {
    setLoading(id + action);
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNote: note[id] }),
    });
    if (res.ok) {
      const statusMap = { approve: "APPROVED", reject: "REJECTED", mark_paid: "PAID" } as const;
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: statusMap[action], adminNote: note[id] ?? r.adminNote }
            : r
        )
      );
    }
    setLoading(null);
  };

  const filtered = statusFilter === "ALL" ? requests : requests.filter((r) => r.status === statusFilter);
  const counts: Record<string, number> = { ALL: requests.length };
  for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
                : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            {s === "ALL" ? "All" : statusConfig[s].label}
            {counts[s] != null && (
              <span className="ml-1.5 opacity-60">{counts[s]}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-text-muted py-8">No payout requests found.</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((req) => {
          const badge = statusConfig[req.status];
          const isExpanded = expanded === req.id;
          const busy = (action: string) => loading === req.id + action;

          return (
            <div key={req.id} className="rounded-xl border border-border bg-surface overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-bg-elevated transition-colors"
                onClick={() => setExpanded(isExpanded ? null : req.id)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center shrink-0 overflow-hidden">
                  {req.user.avatarUrl ? (
                    <img src={req.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-text-muted">
                      {(req.user.displayName ?? req.user.username)[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {req.user.displayName ?? req.user.username}
                    <span className="text-text-muted font-normal ml-1 text-xs">@{req.user.username}</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    KES {Number(req.amount).toLocaleString()} → {req.phone}
                    <span className="ml-2">
                      {new Date(req.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                    </span>
                  </p>
                </div>

                {/* Status badge */}
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                  {badge.icon} {badge.label}
                </span>

                <ChevronDown size={14} className={`text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4 flex flex-col gap-3 bg-bg-elevated/30">
                  {req.adminNote && (
                    <p className="text-xs text-text-muted italic">Note: {req.adminNote}</p>
                  )}

                  {(req.status === "PENDING" || req.status === "APPROVED") && (
                    <>
                      <input
                        type="text"
                        placeholder="Admin note (optional)"
                        value={note[req.id] ?? ""}
                        onChange={(e) => setNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue transition-colors"
                      />
                      <div className="flex gap-2 flex-wrap">
                        {req.status === "PENDING" && (
                          <>
                            <ActionButton
                              label={busy("approve") ? "Approving…" : "Approve"}
                              onClick={() => void act(req.id, "approve")}
                              disabled={loading !== null}
                              variant="approve"
                            />
                            <ActionButton
                              label={busy("reject") ? "Rejecting…" : "Reject & Refund"}
                              onClick={() => void act(req.id, "reject")}
                              disabled={loading !== null}
                              variant="reject"
                            />
                          </>
                        )}
                        {req.status === "APPROVED" && (
                          <>
                            <ActionButton
                              label={busy("mark_paid") ? "Marking…" : "Mark as Paid"}
                              onClick={() => void act(req.id, "mark_paid")}
                              disabled={loading !== null}
                              variant="paid"
                            />
                            <ActionButton
                              label={busy("reject") ? "Rejecting…" : "Reject & Refund"}
                              onClick={() => void act(req.id, "reject")}
                              disabled={loading !== null}
                              variant="reject"
                            />
                          </>
                        )}
                        {loading !== null && (
                          <Loader2 size={14} className="animate-spin text-text-muted self-center" />
                        )}
                      </div>
                    </>
                  )}

                  {(req.status === "PAID" || req.status === "REJECTED") && (
                    <p className="text-xs text-text-muted">
                      {req.status === "PAID" ? "Payment sent." : "Request rejected — amount refunded to wallet."}
                      {req.adminNote && ` Note: ${req.adminNote}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
