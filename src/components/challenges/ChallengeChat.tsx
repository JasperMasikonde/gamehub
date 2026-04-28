"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Send, Copy, CheckCheck, KeyRound, Gamepad2, Lock, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-1.5 text-neon-green/60 hover:text-neon-green transition-colors"
      title="Copy code"
    >
      {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
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

  // Fetch the admin-configured match code pattern
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
      // Auto-open the share-code input when the opponent requests our code
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

  // Last request I sent that the opponent hasn't yet answered with a MATCH_CODE
  const lastPendingRequestId = (() => {
    const myRequests = messages.filter(
      m => m.messageType === "MATCH_CODE_REQUEST" && m.senderId === myId
    );
    if (myRequests.length === 0) return null;
    const last = myRequests[myRequests.length - 1];
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
    } catch {
      // If pattern is broken, skip client-side validation; server will catch it
    }
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
        // Add immediately from HTTP response; socket event will be deduped by ID
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

  return (
    <div className="flex flex-col" style={{ minHeight: "22rem" }}>
      {/* Presence bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0 transition-colors",
            opponentOnline === true
              ? "bg-neon-green shadow-[0_0_6px_rgba(0,255,135,0.7)]"
              : opponentOnline === false
              ? "bg-text-muted"
              : "bg-text-muted/40 animate-pulse"
          )}
        />
        <span className="text-xs text-text-muted">
          {opponentName}
          {" — "}
          {opponentOnline === true
            ? <span className="text-neon-green font-medium">Online</span>
            : opponentOnline === false
            ? <span>Offline</span>
            : <span className="italic">checking…</span>}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4" style={{ maxHeight: "20rem" }}>
        {messages.length === 0 && timeAgreed && (
          <p className="text-center text-xs text-text-muted py-8">
            No messages yet. Request or share your match code below.
          </p>
        )}

        {messages.map((m) => {
          const isMe = m.senderId === myId;

          if (m.messageType === "MATCH_CODE_REQUEST") {
            if (isMe) {
              const isPending = m.id === lastPendingRequestId;
              return (
                <div key={m.id} className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-xs font-medium">
                    <KeyRound size={12} />
                    You requested the match code
                    <span className="text-neon-purple/50 font-normal">
                      · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {isPending && (
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted animate-pulse">
                      <Loader2 size={11} className="animate-spin" />
                      Waiting for opponent to share their code…
                    </div>
                  )}
                </div>
              );
            }
            // Recipient view — prominent action card
            return (
              <div key={m.id} className="rounded-2xl border-2 border-neon-yellow/40 bg-neon-yellow/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-neon-yellow/15 border border-neon-yellow/30 flex items-center justify-center shrink-0">
                    <Bell size={16} className="text-neon-yellow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neon-yellow">
                      {m.senderUsername} needs your match code
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Share your eFootball match code so they can join the game.
                    </p>
                    <p className="text-[10px] text-text-muted/60 mt-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                {!isLocked && (
                  <button
                    onClick={() => setShowCodeInput(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neon-green text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Gamepad2 size={15} />
                    Share My Match Code →
                  </button>
                )}
              </div>
            );
          }

          // MATCH_CODE
          return (
            <div key={m.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
              <div
                className={cn(
                  "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                  isMe
                    ? "bg-neon-green/10 border border-neon-green/20 rounded-tr-sm"
                    : "bg-bg-elevated border border-border rounded-tl-sm"
                )}
              >
                {!isMe && (
                  <p className="text-[10px] font-medium text-text-muted mb-1">{m.senderUsername}</p>
                )}
                <div className="flex items-center gap-1 text-[10px] font-medium text-text-muted mb-1">
                  <Gamepad2 size={11} />
                  {isMe ? "Your match code" : "Match code"}
                </div>
                <div className="flex items-center gap-1">
                  <code className={cn(
                    "font-mono text-sm font-bold tracking-wide px-2 py-1 rounded-lg",
                    isMe ? "bg-neon-green/20 text-neon-green" : "bg-bg-surface text-text-primary"
                  )}>
                    {m.content}
                  </code>
                  {!isMe && <CopyButton text={m.content} />}
                </div>
                <p className="text-[10px] opacity-50 mt-1">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Action bar */}
      {isLocked ? (
        <div className="border-t border-border p-3 text-center text-xs text-text-muted">
          Chat closed — match results have been submitted.
        </div>
      ) : !timeAgreed ? (
        <div className="border-t border-border p-4 flex items-center gap-2 text-xs text-text-muted">
          <Lock size={13} className="shrink-0" />
          Agree on a match time above to unlock the match code exchange.
        </div>
      ) : (
        <div className="border-t border-border p-3 flex flex-col gap-2">
          {showCodeInput ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={codeInput}
                  onChange={(e) => {
                    // Only allow digits and hyphens
                    const val = e.target.value.replace(/[^\d-]/g, "");
                    setCodeInput(val);
                    setCodeError("");
                  }}
                  placeholder={codePattern.hint}
                  maxLength={20}
                  autoFocus
                  className={cn(
                    "flex-1 bg-bg-elevated border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none font-mono",
                    codeError ? "border-neon-red focus:border-neon-red" : "border-border focus:border-neon-green"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && codeInput.trim()) void send("MATCH_CODE", codeInput.trim());
                    if (e.key === "Escape") { setShowCodeInput(false); setCodeInput(""); setCodeError(""); }
                  }}
                />
                <button
                  onClick={() => { if (codeInput.trim()) void send("MATCH_CODE", codeInput.trim()); }}
                  disabled={!codeInput.trim() || sending}
                  className="w-9 h-9 rounded-xl bg-neon-green flex items-center justify-center text-white disabled:opacity-40 transition-opacity hover:opacity-90 shrink-0"
                >
                  <Send size={14} />
                </button>
                <button
                  onClick={() => { setShowCodeInput(false); setCodeInput(""); setCodeError(""); }}
                  className="text-xs text-text-muted hover:text-text-primary underline shrink-0"
                >
                  Cancel
                </button>
              </div>
              {codeError
                ? <p className="text-xs text-neon-red">{codeError}</p>
                : <p className="text-xs text-text-muted">{codePattern.hint}</p>
              }
            </div>
          ) : (
            <div className="flex gap-2">
              {waitingForOpponentCode ? (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-neon-purple/20 bg-neon-purple/5 text-xs text-neon-purple/80">
                  <Loader2 size={12} className="animate-spin shrink-0" />
                  <span>Wait — opponent is sharing their code…</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10"
                  onClick={() => void send("MATCH_CODE_REQUEST")}
                  loading={sending}
                >
                  <KeyRound size={13} />
                  Request Match Code
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-neon-green/40 text-neon-green hover:bg-neon-green/10"
                onClick={() => setShowCodeInput(true)}
                disabled={sending}
              >
                <Gamepad2 size={13} />
                Share My Code
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
