"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  initialBalance: number;
  /** If provided, highlight balance red when it's below this threshold */
  warnBelow?: number;
  className?: string;
}

export function WalletBalanceDisplay({ initialBalance, warnBelow, className }: Props) {
  const [balance, setBalance] = useState(initialBalance);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handler = ({ balance: b }: { balance: number }) => setBalance(b);
    socket.on("wallet_update", handler);
    return () => { socket.off("wallet_update", handler); };
  }, [socket]);

  // Sync if parent re-renders with a different initial value (e.g. router.refresh)
  useEffect(() => { setBalance(initialBalance); }, [initialBalance]);

  const isLow = warnBelow !== undefined && balance < warnBelow;

  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <Wallet size={13} className={isLow ? "text-neon-yellow" : "text-neon-green"} />
      <span className={cn("font-bold tabular-nums", isLow ? "text-neon-yellow" : "text-neon-green")}>
        KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </span>
  );
}
