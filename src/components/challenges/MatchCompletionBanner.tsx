"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";

interface Props {
  completedAt: string;   // ISO string
  payout: number;
  adminUserId: string;
}

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function useCountdown(completedAt: string) {
  const deadline = new Date(completedAt).getTime() + WINDOW_MS;

  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, timeLeft]);

  return timeLeft;
}

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MatchCompletionBanner({ completedAt, payout, adminUserId }: Props) {
  const timeLeft = useCountdown(completedAt);
  const expired = timeLeft <= 0;

  return (
    <div className={`rounded-xl p-4 border-2 flex flex-col gap-3 ${expired ? "bg-neon-yellow/5 border-neon-yellow/30" : "bg-neon-green/5 border-neon-green/30"}`}>
      <div className="flex items-start gap-3">
        <Trophy size={20} className="text-neon-green shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-neon-green text-sm">You won! Payment incoming</p>
          <p className="text-xs text-text-muted mt-0.5">
            You will receive{" "}
            <span className="text-neon-green font-semibold">{formatCurrency(payout.toString())}</span>
            {" "}via M-Pesa within 10 minutes.
          </p>
        </div>
      </div>

      {!expired ? (
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-neon-green shrink-0" />
          <span className="text-text-muted text-xs">Payment expected within</span>
          <span className="font-mono font-bold text-neon-green text-sm tabular-nums">
            {formatMs(timeLeft)}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neon-yellow">
            10 minutes have passed. If you haven&apos;t received your payment yet, contact the admin.
          </p>
          <Link href={`/messages/${adminUserId}`}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <MessageSquare size={13} />
              Chat with Admin
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
