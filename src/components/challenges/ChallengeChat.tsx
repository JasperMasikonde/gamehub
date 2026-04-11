"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Send, Copy, CheckCheck, KeyRound, Gamepad2, Lock } from "lucide-react";
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
}: {
  challengeId: string;
  myId: string;
  status: string;
  timeAgreed: boolean;
  initialMessages: DbMessage[];
}) {
  const { socket } = useSocket();
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
  const [codeInput, setCodeInput] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-challenge", challengeId);

    socket.on("challenge_message", (payload: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
    });

    return () => { socket.off("challenge_message"); };
  }, [socket, challengeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLocked = LOCKED_STATUSES.includes(status);

  const send = async (type: "MATCH_CODE_REQUEST" | "MATCH_CODE", code?: string) => {
    if (sending || isLocked) return;
    setSending(true);
    try {
      await fetch(`/api/challenges/${challengeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "MATCH_CODE" ? { type, code } : { type }),
      });
      if (type === "MATCH_CODE") {
        setCodeInput("");
        setShowCodeInput(false);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "22rem" }}>
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
            return (
              <div key={m.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                <div
                  className={cn(
                    "max-w-[75%] px-3 py-2 rounded-2xl text-sm flex items-center gap-2",
                    isMe
                      ? "bg-neon-purple/10 border border-neon-purple/20 text-neon-purple rounded-tr-sm"
                      : "bg-bg-elevated border border-border text-text-muted rounded-tl-sm"
                  )}
                >
                  <KeyRound size={13} className="shrink-0 opacity-60" />
                  <div>
                    {!isMe && (
                      <p className="text-[10px] font-medium text-text-muted mb-0.5">{m.senderUsername}</p>
                    )}
                    <p className="text-xs">
                      {isMe ? "You requested the match code" : `${m.senderUsername} is requesting your match code`}
                    </p>
                    <p className="text-[10px] opacity-50 mt-0.5">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
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
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Paste your match code here…"
                maxLength={200}
                autoFocus
                className="flex-1 bg-bg-elevated border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-green font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && codeInput.trim()) void send("MATCH_CODE", codeInput.trim());
                  if (e.key === "Escape") { setShowCodeInput(false); setCodeInput(""); }
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
                onClick={() => { setShowCodeInput(false); setCodeInput(""); }}
                className="text-xs text-text-muted hover:text-text-primary underline shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
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
