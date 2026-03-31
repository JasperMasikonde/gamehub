"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";

export function MessagesIcon() {
  const { unreadMessages } = useSocket();

  return (
    <Link
      href="/messages"
      className="relative text-text-muted hover:text-text-primary transition-colors p-1"
    >
      <MessageSquare size={20} />
      {unreadMessages > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-blue text-bg-primary text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadMessages > 9 ? "9+" : unreadMessages}
        </span>
      )}
    </Link>
  );
}
