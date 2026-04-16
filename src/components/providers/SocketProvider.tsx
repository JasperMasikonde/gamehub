"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { ToastContainer } from "@/components/ui/Toast";
import type { ToastPayload, NewMessagePayload } from "@/types/socket";

// ── Notification sound helpers ──────────────────────────────────────────────
// Uses the Web Audio API to synthesise short tones — no audio files needed.

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

/** Play a short synthesised tone. */
function playTone(
  frequency: number,
  type: OscillatorType,
  durationMs: number,
  gainValue: number,
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationMs / 1000);
}

/** Soft double-ping for received notifications. */
function playReceiveSound() {
  playTone(880, "sine", 120, 0.18);
  setTimeout(() => playTone(1100, "sine", 100, 0.12), 130);
}

/** Single soft click for sent messages. */
function playSendSound() {
  playTone(660, "sine", 80, 0.1);
}

interface SocketContextValue {
  socket: Socket | null;
  unreadMessages: number;
  refreshUnread: () => void;
  /** Play the short "sent" sound — call after a message/action is sent. */
  playSendSound: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  unreadMessages: 0,
  refreshUnread: () => {},
  playSendSound: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
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
      playReceiveSound();
      const duration = payload.duration ?? 5000;
      setTimeout(() => removeToast(payload.id), duration);
    });

    socket.on("new_message", (_payload: NewMessagePayload) => {
      setUnreadMessages((prev) => prev + 1);
      playReceiveSound();
    });

    // Tournament list updates — any page using RealtimeRefresh with this event will auto-refresh
    socket.on("tournaments_list_update", () => {
      // Handled by RealtimeRefresh components on individual pages
    });

    socket.on("email_verified", async () => {
      await updateSession();
      router.refresh();
    });

    socket.on("role_updated", async () => {
      await updateSession();
      // Hard navigate so the new JWT is read fresh — router.refresh() alone
      // doesn't force the client-side useSession() to re-read the new role.
      window.location.href = "/admin";
    });

    socket.on("user_banned", () => {
      void signOut({ callbackUrl: "/login?banned=1" });
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
      value={{ socket: socketRef.current, unreadMessages, refreshUnread, playSendSound }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </SocketContext.Provider>
  );
}
