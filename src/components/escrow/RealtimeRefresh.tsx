"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";

/**
 * Invisible component — listens for socket events and calls router.refresh()
 * so the surrounding server component re-fetches its data.
 */
export function RealtimeRefresh({ events }: { events: string[] }) {
  const { socket } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;
    const handler = () => router.refresh();
    events.forEach((e) => socket.on(e, handler));
    return () => {
      events.forEach((e) => socket.off(e, handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, router]);

  return null;
}
