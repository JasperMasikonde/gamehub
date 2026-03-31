"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/SocketProvider";

export function RefreshUnreadOnMount() {
  const { refreshUnread } = useSocket();
  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);
  return null;
}
