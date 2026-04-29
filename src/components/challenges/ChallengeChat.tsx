"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Send, Copy, CheckCheck, KeyRound, Gamepad2, Lock, Loader2, X, User2, UserCheck, AlertCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type MessageType =
  | "MATCH_CODE_REQUEST"
  | "MATCH_CODE"
  | "EFOOTBALL_USERNAME_REQUEST"
  | "EFOOTBALL_USERNAME"
  | "EFOOTBALL_QUICK_REPLY";

interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  messageType: MessageType;
  content: string;
  createdAt: string;
}

interface DbMessage {
  id: string;
  senderId: string;
  messageType: MessageType;
  content: string;
  createdAt: string;
  sender: { id: string; username: string; displayName: string | null };
}

const LOCKED_STATUSES = ["COMPLETED", "DISPUTED", "CANCELLED"];

const QUICK_REPLY_LABELS: Record<string, { label: string; icon: "wrong" | "accept" | "sent" }> = {
  USERNAME_WRONG:          { label: "That username is wrong — please check again", icon: "wrong" },
  ACCEPT_FRIEND_REQUEST:   { label: "Please accept my friend request in eFootball", icon: "accept" },
  FRIEND_REQUEST_SENT:     { label: "Friend request sent — check eFootball to accept", icon: "sent" },
};

const QUICK_REPLY_OPTIONS = [
  { key: "USERNAME_WRONG",        label: "Username is wrong",        color: "neon-red" },
  { key: "ACCEPT_FRIEND_REQUEST", label: "Accept friend request",    color: "neon-green" },
  { key: "FRIEND_REQUEST_SENT",   label: "Friend request sent",      color: "neon-blue" },
] as const;

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
      title="Copy"
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

  // Match code state
  const [codeInput, setCodeInput] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codePattern, setCodePattern] = useState<{ pattern: string; hint: string }>({
    pattern: "^\\d{4}-?\\d{4}$",
    hint: "8 digits, e.g. 12345678 or 1234-5678",
  });

  // Username exchange state
  const [mode, setMode] = useState<"codes" | "username">("codes");
  const [usernameInput, setUsernameInput] = useState("");
  const [showUsernameInput, setShowUsernameInput] = useState(false);

  const [sending, setSending] = useState(false);
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
        setMode("codes");
      }
      if (payload.messageType === "EFOOTBALL_USERNAME_REQUEST" && payload.senderId !== myId) {
        setShowUsernameInput(true);
        setMode("username");
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

  const lastPendingUsernameRequestId = (() => {
    const mine = messages.filter(m => m.messageType === "EFOOTBALL_USERNAME_REQUEST" && m.senderId === myId);
    if (!mine.length) return null;
    const last = mine[mine.length - 1];
    const answered = messages.some(
      m => m.messageType === "EFOOTBALL_USERNAME" && m.senderId !== myId && m.createdAt > last.createdAt
    );
    return answered ? null : last.id;
  })();
  const waitingForOpponentUsername = lastPendingUsernameRequestId !== null;

  // After receiving opponent's username, show quick replies unless one was already sent after it
  const lastReceivedUsername = (() => {
    const received = messages.filter(m => m.messageType === "EFOOTBALL_USERNAME" && m.senderId !== myId);
    return received[received.length - 1] ?? null;
  })();
  const alreadyRepliedToUsername = lastReceivedUsername
    ? messages.some(m => m.messageType === "EFOOTBALL_QUICK_REPLY" && m.senderId === myId && m.createdAt > lastReceivedUsername.createdAt)
    : false;
  const showQuickReplies = !isLocked && lastReceivedUsername !== null && !alreadyRepliedToUsername;

  const validateCode = (value: string): boolean => {
    try {
      if (!new RegExp(codePattern.pattern).test(value)) {
        setCodeError(`Invalid format — ${codePattern.hint}`);
        return false;
      }
    } catch { /* skip if pattern is broken */ }
    setCodeError("");
    return true;
  };

  const send = async (
    type: MessageType,
    payload?: { code?: string; username?: string; key?: string }
  ) => {
    if (sending || isLocked) return;
    if (type === "MATCH_CODE" && payload?.code !== undefined && !validateCode(payload.code)) return;
    setSending(true);
    try {
      const body: Record<string, string> = { type };
      if (payload?.code)     body.code = payload.code;
      if (payload?.username) body.username = payload.username;
      if (payload?.key)      body.key = payload.key;

      const res = await fetch(`/api/challenges/${challengeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        if (type === "EFOOTBALL_USERNAME") {
          setUsernameInput("");
          setShowUsernameInput(false);
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

          // ── Match code request ──────────────────────────────────────────
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
                      onClick={() => { setShowCodeInput(true); setMode("codes"); }}
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

          // ── eFootball username request ──────────────────────────────────
          if (m.messageType === "EFOOTBALL_USERNAME_REQUEST") {
            if (isMe) {
              const isPending = m.id === lastPendingUsernameRequestId;
              return (
                <div key={m.id} className="flex flex-col items-center gap-2 py-1">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-elevated border border-border text-xs text-text-muted">
                    <User2 size={11} className="text-neon-blue/70" />
                    <span>You asked for their eFootball username</span>
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
            return (
              <div key={m.id} className="flex gap-2.5 items-start">
                <Avatar name={m.senderUsername} />
                <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm border border-neon-blue/30 bg-neon-blue/5 overflow-hidden">
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-neon-blue leading-snug">
                      {m.senderUsername} is asking for your eFootball username
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Share your username so they can send a friend request in the game.
                    </p>
                    <p className="text-[11px] text-text-muted/50 mt-1">{fmt(m.createdAt)}</p>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => { setShowUsernameInput(true); setMode("username"); }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-neon-blue/10 hover:bg-neon-blue/20 border-t border-neon-blue/20 text-neon-blue text-sm font-semibold transition-colors active:scale-[0.99]"
                    >
                      <User2 size={14} />
                      Share My eFootball Username
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // ── eFootball username bubble ───────────────────────────────────
          if (m.messageType === "EFOOTBALL_USERNAME") {
            const isLastReceived = !isMe && lastReceivedUsername?.id === m.id;
            return (
              <div key={m.id} className="flex flex-col gap-2">
                <div className={cn("flex gap-2.5 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
                  {!isMe && <Avatar name={m.senderUsername} />}
                  <div className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-3 flex flex-col gap-2",
                    isMe
                      ? "bg-neon-blue/10 border border-neon-blue/25 rounded-br-sm"
                      : "bg-bg-elevated border border-border rounded-bl-sm"
                  )}>
                    {!isMe && <p className="text-[11px] font-medium text-text-muted">{m.senderUsername}</p>}
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      <User2 size={11} />
                      {isMe ? "Your eFootball username" : "Their eFootball username"}
                    </div>
                    <div className={cn(
                      "text-base font-bold font-mono tracking-wide px-3 py-2 rounded-xl",
                      isMe
                        ? "bg-neon-blue/20 text-neon-blue"
                        : "bg-bg-surface text-text-primary"
                    )}>
                      {m.content}
                    </div>
                    {!isMe && <CopyButton text={m.content} />}
                    <p className={cn("text-[11px] opacity-40 text-right", isMe ? "" : "text-left")}>
                      {fmt(m.createdAt)}
                    </p>
                  </div>
                </div>
                {/* Quick replies for the last received username */}
                {isLastReceived && showQuickReplies && (
                  <div className="flex flex-wrap gap-2 pl-9">
                    {QUICK_REPLY_OPTIONS.map((qr) => (
                      <button
                        key={qr.key}
                        disabled={sending}
                        onClick={() => void send("EFOOTBALL_QUICK_REPLY", { key: qr.key })}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 disabled:opacity-50",
                          qr.color === "neon-red"   && "border-neon-red/40 bg-neon-red/10 text-neon-red hover:bg-neon-red/20",
                          qr.color === "neon-green" && "border-neon-green/40 bg-neon-green/10 text-neon-green hover:bg-neon-green/20",
                          qr.color === "neon-blue"  && "border-neon-blue/40 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20",
                        )}
                      >
                        {qr.color === "neon-red"   && <AlertCircle size={11} />}
                        {qr.color === "neon-green" && <UserCheck size={11} />}
                        {qr.color === "neon-blue"  && <User2 size={11} />}
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // ── Quick reply pill ────────────────────────────────────────────
          if (m.messageType === "EFOOTBALL_QUICK_REPLY") {
            const info = QUICK_REPLY_LABELS[m.content];
            return (
              <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  isMe
                    ? "bg-bg-elevated border-border text-text-muted"
                    : m.content === "USERNAME_WRONG"
                    ? "bg-neon-red/10 border-neon-red/30 text-neon-red"
                    : "bg-neon-green/10 border-neon-green/30 text-neon-green"
                )}>
                  {m.content === "USERNAME_WRONG"        && <AlertCircle size={11} />}
                  {m.content === "ACCEPT_FRIEND_REQUEST" && <UserCheck size={11} />}
                  {m.content === "FRIEND_REQUEST_SENT"   && <User2 size={11} />}
                  {info?.label ?? m.content}
                  <span className="opacity-40 font-normal">· {fmt(m.createdAt)}</span>
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
                {!isMe && <p className="text-[11px] font-medium text-text-muted">{m.senderUsername}</p>}
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
      ) : showCodeInput && mode === "codes" ? (
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
                if (e.key === "Enter" && codeInput.trim()) void send("MATCH_CODE", { code: codeInput.trim() });
                if (e.key === "Escape") { setShowCodeInput(false); setCodeInput(""); setCodeError(""); }
              }}
            />
            <button
              onClick={() => { if (codeInput.trim()) void send("MATCH_CODE", { code: codeInput.trim() }); }}
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
      ) : showUsernameInput && mode === "username" ? (
        /* ── Username input ────────────────────────────────────────────── */
        <div className="border-t border-border p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <User2 size={13} className="text-neon-blue shrink-0" />
            <p className="text-xs font-medium text-text-primary">Enter your eFootball username</p>
            <button
              onClick={() => { setShowUsernameInput(false); setUsernameInput(""); }}
              className="ml-auto text-text-muted hover:text-text-primary transition-colors p-1 -mr-1"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Your eFootball username"
              maxLength={100}
              autoFocus
              className="flex-1 bg-bg-elevated border border-border focus:border-neon-blue rounded-xl px-4 py-3 text-base font-semibold text-text-primary placeholder:text-text-muted/50 placeholder:font-normal placeholder:text-sm focus:outline-none transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && usernameInput.trim()) void send("EFOOTBALL_USERNAME", { username: usernameInput.trim() });
                if (e.key === "Escape") { setShowUsernameInput(false); setUsernameInput(""); }
              }}
            />
            <button
              onClick={() => { if (usernameInput.trim()) void send("EFOOTBALL_USERNAME", { username: usernameInput.trim() }); }}
              disabled={!usernameInput.trim() || sending}
              className="w-12 h-12 rounded-xl bg-neon-blue flex items-center justify-center text-black disabled:opacity-40 transition-all active:scale-95 shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-text-muted/60 px-1">
            Your opponent will search you in eFootball and send a friend request.
          </p>
        </div>
      ) : (
        /* ── Default action buttons ────────────────────────────────────── */
        <div className="border-t border-border p-3 flex flex-col gap-2">
          {/* Mode tabs */}
          <div className="flex gap-1.5 px-0.5">
            <button
              onClick={() => setMode("codes")}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                mode === "codes"
                  ? "border-neon-purple/40 bg-neon-purple/10 text-neon-purple"
                  : "border-border text-text-muted hover:text-text-primary"
              )}
            >
              <Gamepad2 size={10} />
              Match Code
            </button>
            <button
              onClick={() => setMode("username")}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                mode === "username"
                  ? "border-neon-blue/40 bg-neon-blue/10 text-neon-blue"
                  : "border-border text-text-muted hover:text-text-primary"
              )}
            >
              <User2 size={10} />
              eFootball Username
            </button>
          </div>

          {mode === "codes" ? (
            <div className="flex gap-2">
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
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
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
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {waitingForOpponentUsername ? (
                  <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-neon-blue/20 bg-neon-blue/5">
                    <Loader2 size={14} className="animate-spin text-neon-blue shrink-0" />
                    <p className="text-xs text-neon-blue/80 font-medium">Waiting for opponent&apos;s username…</p>
                  </div>
                ) : (
                  <button
                    onClick={() => void send("EFOOTBALL_USERNAME_REQUEST")}
                    disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neon-blue/40 bg-neon-blue/5 text-neon-blue text-sm font-semibold hover:bg-neon-blue/10 transition-colors active:scale-[0.98] disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <User2 size={14} />}
                    Request Username
                  </button>
                )}
                <button
                  onClick={() => setShowUsernameInput(true)}
                  disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neon-blue/40 bg-neon-blue/5 text-neon-blue text-sm font-semibold hover:bg-neon-blue/10 transition-colors active:scale-[0.98] disabled:opacity-50"
                >
                  <User2 size={14} />
                  Share Username
                </button>
              </div>
              <p className="text-[10px] text-text-muted/60 text-center px-2 leading-relaxed">
                Can&apos;t copy the match code in time? Share your eFootball username instead — your opponent can send a friend request and invite you directly.
              </p>
              <button
                onClick={() => setMode("codes")}
                className="flex items-center justify-center gap-1 text-[11px] text-text-muted hover:text-neon-purple transition-colors py-0.5"
              >
                <ArrowLeft size={10} />
                Back to match codes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
