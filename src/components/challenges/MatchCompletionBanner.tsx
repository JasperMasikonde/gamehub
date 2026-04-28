"use client";

import { Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

interface Props {
  payout: number;
  winnerName: string;
}

export function MatchCompletionBanner({ payout, winnerName }: Props) {
  return (
    <div className="rounded-xl p-5 border-2 border-neon-green/40 bg-neon-green/5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Trophy size={22} className="text-neon-green shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-neon-green text-base">You won! 🏆</p>
          <p className="text-sm text-text-primary mt-0.5">
            Congratulations <span className="font-semibold">{winnerName}</span>!
          </p>
          <p className="text-xs text-text-muted mt-1">
            <span className="font-semibold text-neon-green">{formatCurrency(payout.toString())}</span> has been credited to your wallet.
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/wallet"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-neon-green text-black text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <Wallet size={15} />
        Go to Wallet &amp; Request Payout
      </Link>
    </div>
  );
}
