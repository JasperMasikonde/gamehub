"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Send, Users } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  sender: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

interface Props {
  slug: string;
  initialMessages: Message[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" });
}

export function TournamentGroupChat({ slug, initialMessages }: Props) {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const myId = session?.user?.id ?? "";
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join tournament room and listen for real-time messages
  useEffect(() => {
    if (!socket) return;
    socket.emit("join-tournament", slug);

    const handler = (payload: { id: string; senderId: string; senderUsername: string; senderDisplayName: string | null; content: string; imageUrl: string | null; createdAt: string }) => {
      setMessages(prev => {
        if (prev.find(m => m.id === payload.id)) return prev;
        return [...prev, {
          id: payload.id,
          senderId: payload.senderId,
          content: payload.content,
          imageUrl: payload.imageUrl,
          createdAt: payload.createdAt,
          sender: { id: payload.senderId, username: payload.senderUsername, displayName: payload.senderDisplayName, avatarUrl: null },
        }];
      });
    };

    socket.on("tournament_message", handler);
    return () => { socket.off("tournament_message", handler); };
  }, [socket, slug]);

  async function send() {
    if (!input.trim()) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    await fetch(`/api/tournaments/${slug}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: body }),
    });
    setSending(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  // Group messages by date
  const grouped: { label: string; items: Message[] }[] = [];
  for (const m of messages) {
    const label = formatDateLabel(m.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.label === label) { last.items.push(m); }
    else { grouped.push({ label, items: [m] }); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0" style={{ maxHeight: "420px" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Users size={24} className="text-text-muted mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No messages yet. Say hi!</p>
          </div>
        )}
        {grouped.map(group => (
          <div key={group.label}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-bg-border" />
              <span className="text-[10px] text-text-muted">{group.label}</span>
              <div className="flex-1 h-px bg-bg-border" />
            </div>
            {group.items.map((m, i) => {
              const isMe = m.senderId === myId;
              const prevItem = group.items[i - 1];
              const sameAuthor = prevItem?.senderId === m.senderId;
              return (
                <div key={m.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""} ${sameAuthor ? "mt-0.5" : "mt-3"}`}>
                  {/* Avatar */}
                  {!sameAuthor ? (
                    <div className="w-7 h-7 rounded-full bg-bg-elevated border border-bg-border flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-semibold text-text-muted">
                      {m.sender.avatarUrl
                        ? <img src={m.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : (m.sender.displayName ?? m.sender.username)[0].toUpperCase()
                      }
                    </div>
                  ) : (
                    <div className="w-7 flex-shrink-0" />
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {!sameAuthor && (
                      <p className={`text-[10px] text-text-muted mb-0.5 ${isMe ? "text-right" : ""}`}>
                        {isMe ? "You" : (m.sender.displayName ?? m.sender.username)}
                      </p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMe ? "bg-neon-blue text-white rounded-tr-sm" : "bg-bg-elevated border border-bg-border text-text-primary rounded-tl-sm"}`}>
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="max-w-full rounded-xl mb-1" />}
                      {m.content}
                    </div>
                    <p className="text-[9px] text-text-muted mt-0.5 px-1">{formatTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-bg-border p-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Message the group…"
          className="flex-1 resize-none bg-bg-elevated border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-blue/50 max-h-24 overflow-y-auto"
          style={{ lineHeight: "1.5" }}
        />
        <button
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="w-9 h-9 rounded-xl bg-neon-blue flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
