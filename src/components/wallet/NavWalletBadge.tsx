"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Wallet } from "lucide-react";
import Link from "next/link";

export function NavWalletBadge() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [balance, setBalance] = useState<number | null>(null);

  const onChallenges = pathname.startsWith("/challenges");

  // Fetch balance when entering the challenges section
  useEffect(() => {
    if (!onChallenges || !session?.user) { setBalance(null); return; }
    fetch("/api/wallet")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setBalance(Number(d.balance)); })
      .catch(() => {});
  }, [onChallenges, session?.user]);

  // Keep in sync via WebSocket
  useEffect(() => {
    if (!socket) return;
    const handler = ({ balance: b }: { balance: number }) => setBalance(b);
    socket.on("wallet_update", handler);
    return () => { socket.off("wallet_update", handler); };
  }, [socket]);

  if (!onChallenges || !session?.user || balance === null) return null;

  return (
    <Link
      href="/dashboard/wallet"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neon-green/10 border border-neon-green/20 hover:bg-neon-green/15 transition-colors"
      title="Your wallet balance"
    >
      <Wallet size={12} className="text-neon-green" />
      <span className="text-xs font-bold tabular-nums text-neon-green">
        KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </Link>
  );
}
