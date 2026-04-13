"use client";

import { useState } from "react";
import { CheckCircle, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  payoutId: string;
  status: "PENDING" | "APPROVED" | "PAID";
  phone: string;
  amount: number;
}

export function AdminPayoutActions({ payoutId, status: initialStatus, phone, amount }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "mark_paid") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setStatus(action === "approve" ? "APPROVED" : "PAID");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (status === "PAID") {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-neon-green">
        <CheckCircle size={11} /> Paid
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "PENDING" && (
        <button
          onClick={() => act("approve")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors",
            "border-neon-blue/30 text-neon-blue bg-neon-blue/10 hover:bg-neon-blue/20"
          )}
        >
          {loading ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
          Approve
        </button>
      )}
      {status === "APPROVED" && (
        <button
          onClick={() => act("mark_paid")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors",
            "border-neon-green/30 text-neon-green bg-neon-green/10 hover:bg-neon-green/20"
          )}
        >
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
          Mark Paid
        </button>
      )}
      {error && <p className="text-[10px] text-neon-red">{error}</p>}
    </div>
  );
}
