"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
}

interface DbMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string; displayName: string | null };
}

const LOCKED_STATUSES = ["COMPLETED", "DISPUTED", "CANCELLED"];

export function ChallengeChat({
  challengeId,
  myId,
  status,
  initialMessages,
}: {
  challengeId: string;
  myId: string;
  status: string;
  initialMessages: DbMessage[];
}) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderUsername: m.sender.displayName ?? m.sender.username,
      content: m.content,
      createdAt: m.createdAt,
    }))
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Join challenge room on mount
  useEffect(() => {
    if (!socket) return;
    socket.emit("join-challenge", challengeId);

    socket.on("challenge_message", (payload: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
    });

    return () => {
      socket.off("challenge_message");
    };
  }, [socket, challengeId]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLocked = LOCKED_STATUSES.includes(status);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || isLocked) return;
    setSending(true);
    setInput("");
    try {
      await fetch(`/api/challenges/${challengeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-text-muted py-8">
            No messages yet. Exchange your match code here.
          </p>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === myId;
          return (
            <div key={m.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
              <div
                className={cn(
                  "max-w-[75%] px-3 py-2 rounded-2xl text-sm",
                  isMe
                    ? "bg-neon-purple/20 text-text-primary rounded-tr-sm"
                    : "bg-bg-elevated border border-bg-border text-text-primary rounded-tl-sm"
                )}
              >
                {!isMe && (
                  <p className="text-[10px] text-text-muted mb-1 font-medium">{m.senderUsername}</p>
                )}
                <p className="leading-relaxed">{m.content}</p>
                <p className={cn("text-[10px] mt-1", isMe ? "text-neon-purple/60 text-right" : "text-text-muted")}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isLocked ? (
        <div className="border-t border-bg-border p-3 text-center text-xs text-text-muted">
          Chat is closed — results have been submitted.
        </div>
      ) : (
        <form onSubmit={send} className="border-t border-bg-border p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message or share your match code…"
            maxLength={1000}
            className="flex-1 bg-bg-elevated border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-neon-purple flex items-center justify-center text-white disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
}
