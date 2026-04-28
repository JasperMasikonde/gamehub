"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Send, Copy, CheckCheck, KeyRound, Gamepad2, Lock, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  messageType: "MATCH_CODE_REQUEST" | "MATCH_CODE";
  content: string;
  createdAt: string;
}

interface DbMessage {
  id: string;
  senderId: string;
  messageType: "MATCH_CODE_REQUEST" | "MATCH_CODE";
  content: string;
  createdAt: string;
  sender: { id: string; username: string; displayName: string | null };
}

const LOCKED_STATUSES = ["COMPLETED", "DISPUTED", "CANCELLED"];

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-bg-surface border border-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0 select-none">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface border border-border text-xs text-text-muted hover:border-neon-green hover:text-neon-green transition-colors active:scale-95"
      title="Copy code"
    >
      {copied ? <><CheckCheck size={12} className="text-neon-green" /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

export function ChallengeChat({
  challengeId,
  myId,
  status,
  timeAgreed,
  initialMessages,
  opponentName,
}: {
  challengeId: string;
  myId: string;
  status: string;
  timeAgreed: boolean;
  initialMessages: DbMessage[];
  opponentName: string;
}) {
  const { socket, playSendSound } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderUsername: m.sender.displayName ?? m.sender.username,
      messageType: m.messageType,
      content: m.content,
      createdAt: m.createdAt,
    }))
  );
  const [opponentOnline, setOpponentOnline] = useState<boolean | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codePattern, setCodePattern] = useState<{ pattern: string; hint: string }>({
    pattern: "^\\d{4}-?\\d{4}$",
    hint: "8 digits, e.g. 12345678 or 1234-5678",
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/config/match-code-pattern")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCodePattern(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-challenge", challengeId);

    const handleMessage = (payload: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
      if (payload.messageType === "MATCH_CODE_REQUEST" && payload.senderId !== myId) {
        setShowCodeInput(true);
      }
    };
    const handleOnline  = () => setOpponentOnline(true);
    const handleOffline = () => setOpponentOnline(false);

    socket.on("challenge_message", handleMessage);
    socket.on("opponent_online",   handleOnline);
    socket.on("opponent_offline",  handleOffline);
    return () => {
      socket.off("challenge_message", handleMessage);
      socket.off("opponent_online",   handleOnline);
      socket.off("opponent_offline",  handleOffline);
    };
  }, [socket, challengeId, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLocked = LOCKED_STATUSES.includes(status);

  const lastPendingRequestId = (() => {
    const mine = messages.filter(m => m.messageType === "MATCH_CODE_REQUEST" && m.senderId === myId);
    if (!mine.length) return null;
    const last = mine[mine.length - 1];
    const answered = messages.some(
      m => m.messageType === "MATCH_CODE" && m.senderId !== myId && m.createdAt > last.createdAt
    );
    return answered ? null : last.id;
  })();
  const waitingForOpponentCode = lastPendingRequestId !== null;

  const validateCode = (value: string): boolean => {
    try {
      if (!new RegExp(codePattern.pattern).test(value)) {
        setCodeError(`Invalid format — ${codePattern.hint}`);
        return false;
      }
    } catch { /* skip client validation if pattern is broken */ }
    setCodeError("");
    return true;
  };

  const send = async (type: "MATCH_CODE_REQUEST" | "MATCH_CODE", code?: string) => {
    if (sending || isLocked) return;
    if (type === "MATCH_CODE" && code !== undefined && !validateCode(code)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "MATCH_CODE" ? { type, code } : { type }),
      });
      if (res.ok) {
        const data = await res.json() as { message: DbMessage };
        const newMsg: ChatMessage = {
          id: data.message.id,
          senderId: data.message.senderId,
          senderUsername: data.message.sender.displayName ?? data.message.sender.username,
          messageType: data.message.messageType,
          content: data.message.content,
          createdAt: typeof data.message.createdAt === "string"
            ? data.message.createdAt
            : new Date(data.message.createdAt).toISOString(),
        };
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        playSendSound();
        if (type === "MATCH_CODE") {
          setCodeInput("");
          setShowCodeInput(false);
          setCodeError("");
        }
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (type === "MATCH_CODE") setCodeError(data.error ?? "Failed to send code");
      }
    } finally {
      setSending(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* ── Presence header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-sm font-bold text-neon-purple select-none">
            {opponentName[0]?.toUpperCase() ?? "?"}
          </div>
          <span
            className={cn(
              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-elevated",
              opponentOnline === true
                ? "bg-neon-green shadow-[0_0_6px_rgba(0,255,135,0.8)]"
                : opponentOnline === false
                ? "bg-text-muted"
                : "bg-text-muted/40 animate-pulse"
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{opponentName}</p>
          <p className={cn(
            "text-xs font-medium",
            opponentOnline === true ? "text-neon-green"
            : opponentOnline === null ? "text-text-muted/60 italic"
            : "text-text-muted"
          )}>
            {opponentOnline === true ? "Online now"
              : opponentOnline === false ? "Offline"
              : "Connecting…"}
          </p>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex flex-col gap-3 px-4 py-4 min-h-[280px] max-h-[420px]">
        {messages.length === 0 && timeAgreed && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-2">
            <Gamepad2 size={28} className="text-text-muted/40" />
            <p className="text-sm text-text-muted">No messages yet</p>
            <p className="text-xs text-text-muted/60">Request or share your match code below.</p>
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.senderId === myId;

          // ── Code request ────────────────────────────────────────────────
          if (m.messageType === "MATCH_CODE_REQUEST") {
            if (isMe) {
              const isPending = m.id === lastPendingRequestId;
              return (
                <div key={m.id} className="flex flex-col items-center gap-2 py-1">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-elevated border border-border text-xs text-text-muted">
                    <KeyRound size={11} className="text-neon-purple/70" />
                    <span>You requested the match code</span>
                    <span className="opacity-50">·</span>
                    <span className="opacity-50">{fmt(m.createdAt)}</span>
                  </div>
                  {isPending && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted/70">
                      <Loader2 size={11} className="animate-spin shrink-0" />
                      Waiting for opponent…
                    </div>
                  )}
                </div>
              );
            }

            // Received — action card
            return (
              <div key={m.id} className="flex gap-2.5 items-start">
                <Avatar name={m.senderUsername} />
                <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm border border-neon-yellow/30 bg-neon-yellow/5 overflow-hidden">
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-neon-yellow leading-snug">
                      {m.senderUsername} is requesting your match code
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Share your eFootball code so they can join the match.
                    </p>
                    <p className="text-[11px] text-text-muted/50 mt-1">{fmt(m.createdAt)}</p>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => setShowCodeInput(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-neon-green/10 hover:bg-neon-green/20 border-t border-neon-green/20 text-neon-green text-sm font-semibold transition-colors active:scale-[0.99]"
                    >
                      <Gamepad2 size={14} />
                      Share My Match Code
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // ── Match code bubble ───────────────────────────────────────────
          return (
            <div key={m.id} className={cn("flex gap-2.5 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
              {!isMe && <Avatar name={m.senderUsername} />}

              <div className={cn(
                "max-w-[78%] rounded-2xl px-4 py-3 flex flex-col gap-2",
                isMe
                  ? "bg-neon-purple/10 border border-neon-purple/25 rounded-br-sm"
                  : "bg-bg-elevated border border-border rounded-bl-sm"
              )}>
                {!isMe && (
                  <p className="text-[11px] font-medium text-text-muted">{m.senderUsername}</p>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Gamepad2 size={11} />
                  {isMe ? "Your match code" : "Their match code"}
                </div>
                <code className={cn(
                  "text-xl font-mono font-black tracking-widest px-3 py-2 rounded-xl text-center",
                  isMe
                    ? "bg-neon-purple/20 text-neon-purple"
                    : "bg-bg-surface text-text-primary"
                )}>
                  {m.content}
                </code>
                {!isMe && <CopyButton text={m.content} />}
                <p className={cn("text-[11px] opacity-40 text-right", isMe ? "" : "text-left")}>
                  {fmt(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      {isLocked ? (
        <div className="border-t border-border px-4 py-3.5 flex items-center justify-center gap-2 text-xs text-text-muted bg-bg-elevated/40">
          <Lock size={12} />
          Chat closed — match has ended.
        </div>
      ) : !timeAgreed ? (
        <div className="border-t border-border px-4 py-4 flex items-start gap-3 bg-bg-elevated/30">
          <Lock size={14} className="text-text-muted/60 shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted leading-relaxed">
            Agree on a match time above to unlock the match code exchange.
          </p>
        </div>
      ) : showCodeInput ? (
        /* ── Code input ────────────────────────────────────────────────── */
        <div className="border-t border-border p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Gamepad2 size={13} className="text-neon-green shrink-0" />
            <p className="text-xs font-medium text-text-primary">Enter your match code</p>
            <button
              onClick={() => { setShowCodeInput(false); setCodeInput(""); setCodeError(""); }}
              className="ml-auto text-text-muted hover:text-text-primary transition-colors p-1 -mr-1"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.replace(/[^\d-]/g, ""));
                setCodeError("");
              }}
              placeholder={codePattern.hint}
              maxLength={20}
              autoFocus
              className={cn(
                "flex-1 bg-bg-elevated border rounded-xl px-4 py-3 text-base font-mono font-semibold text-text-primary placeholder:text-text-muted/50 placeholder:font-normal placeholder:text-sm focus:outline-none transition-colors",
                codeError
                  ? "border-neon-red focus:border-neon-red"
                  : "border-border focus:border-neon-green"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codeInput.trim()) void send("MATCH_CODE", codeInput.trim());
                if (e.key === "Escape") { setShowCodeInput(false); setCodeInput(""); setCodeError(""); }
              }}
            />
            <button
              onClick={() => { if (codeInput.trim()) void send("MATCH_CODE", codeInput.trim()); }}
              disabled={!codeInput.trim() || sending}
              className="w-12 h-12 rounded-xl bg-neon-green flex items-center justify-center text-black disabled:opacity-40 transition-all active:scale-95 shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {codeError
            ? <p className="text-xs text-neon-red px-1">{codeError}</p>
            : <p className="text-xs text-text-muted/60 px-1">{codePattern.hint}</p>
          }
        </div>
      ) : (
        /* ── Default action buttons ────────────────────────────────────── */
        <div className="border-t border-border p-3 flex gap-2.5">
          {waitingForOpponentCode ? (
            <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-neon-purple/20 bg-neon-purple/5">
              <Loader2 size={14} className="animate-spin text-neon-purple shrink-0" />
              <p className="text-xs text-neon-purple/80 font-medium">Waiting for opponent&apos;s code…</p>
            </div>
          ) : (
            <button
              onClick={() => void send("MATCH_CODE_REQUEST")}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neon-purple/40 bg-neon-purple/5 text-neon-purple text-sm font-semibold hover:bg-neon-purple/10 transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              {sending
                ? <Loader2 size={14} className="animate-spin" />
                : <KeyRound size={14} />}
              Request Code
            </button>
          )}
          <button
            onClick={() => setShowCodeInput(true)}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neon-green/40 bg-neon-green/5 text-neon-green text-sm font-semibold hover:bg-neon-green/10 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            <Gamepad2 size={14} />
            Share My Code
          </button>
        </div>
      )}
    </div>
  );
}
