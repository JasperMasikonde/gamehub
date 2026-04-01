"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";

export function TournamentRealtimeRefresh({ slug }: { slug: string }) {
  const { socket } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-tournament", slug);
    const handler = () => router.refresh();
    socket.on("tournament_update", handler);
    return () => { socket.off("tournament_update", handler); };
  }, [socket, slug, router]);

  return null;
}
