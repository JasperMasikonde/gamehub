"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Banknote } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";

interface Props {
  initialPending: number;
  initialApproved: number;
}

export function AdminPayoutsCard({ initialPending, initialApproved }: Props) {
  const { socket } = useSocket();
  const [pending, setPending] = useState(initialPending);
  const [approved, setApproved] = useState(initialApproved);

  const actionable = pending + approved;

  const refresh = async () => {
    try {
      const res = await fetch("/api/admin/payouts?count=true");
      if (res.ok) {
        const data = await res.json() as { pending: number; approved: number };
        setPending(data.pending);
        setApproved(data.approved);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = (payload: { resource: string }) => {
      if (payload.resource === "payouts") void refresh();
    };
    socket.on("admin_refresh", handleRefresh);
    return () => { socket.off("admin_refresh", handleRefresh); };
  }, [socket]);

  return (
    <Link href="/admin/payouts">
      <div className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
        ${actionable > 0
          ? "bg-neon-purple/5 border-neon-purple/30 hover:bg-neon-purple/10"
          : "bg-bg-elevated border-bg-border hover:border-bg-border/80"}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
          ${actionable > 0 ? "bg-neon-purple/15" : "bg-bg-surface"}`}>
          <Banknote size={18} className={actionable > 0 ? "text-neon-purple" : "text-text-muted"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">Payout Requests</p>
          <p className="text-xs text-text-muted mt-0.5">
            {actionable > 0
              ? `${pending > 0 ? `${pending} pending` : ""}${pending > 0 && approved > 0 ? " · " : ""}${approved > 0 ? `${approved} approved` : ""}`
              : "No pending requests"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-black ${actionable > 0 ? "text-neon-purple" : "text-text-muted"}`}>
            {actionable}
          </p>
        </div>
      </div>
    </Link>
  );
}
