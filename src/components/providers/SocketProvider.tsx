"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { ToastContainer } from "@/components/ui/Toast";
import type { ToastPayload, NewMessagePayload } from "@/types/socket";

interface SocketContextValue {
  socket: Socket | null;
  unreadMessages: number;
  refreshUnread: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  unreadMessages: 0,
  refreshUnread: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [toasts, setToasts] = useState<ToastPayload[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/messages?unread=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("authenticate", session.user.id);
      if (session.user.role === "ADMIN") {
        socket.emit("join-admin");
      }
    });

    socket.on("toast", (payload: ToastPayload) => {
      setToasts((prev) => [...prev, payload]);
      const duration = payload.duration ?? 5000;
      setTimeout(() => removeToast(payload.id), duration);
    });

    socket.on("new_message", (_payload: NewMessagePayload) => {
      setUnreadMessages((prev) => prev + 1);
    });

    // Tournament list updates — any page using RealtimeRefresh with this event will auto-refresh
    socket.on("tournaments_list_update", () => {
      // Handled by RealtimeRefresh components on individual pages
    });

    // Load initial unread count
    refreshUnread();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, unreadMessages, refreshUnread }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </SocketContext.Provider>
  );
}
