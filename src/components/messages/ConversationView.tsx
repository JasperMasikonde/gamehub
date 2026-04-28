"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Send, User, ShieldCheck, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { compressImage } from "@/lib/utils/compress-image";
import { useSocket } from "@/components/providers/SocketProvider";
import type { NewMessagePayload } from "@/types/socket";

interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  imageUrl?: string | null;
  createdAt: Date | string;
  sender: MessageUser;
}

interface OtherUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
}

function Avatar({ user, size = 8 }: { user: Pick<OtherUser, "avatarUrl" | "username">; size?: number }) {
  const px = size * 4;
  return (
    <div
      className="rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: px, height: px }}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
      ) : (
        <User size={px * 0.45} className="text-text-muted" />
      )}
    </div>
  );
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function ConversationView({
  initialMessages,
  otherUser,
  myId,
  backHref = "/messages",
}: {
  initialMessages: Message[];
  otherUser: OtherUser;
  myId: string;
  backHref?: string;
}) {
  const { socket, refreshUnread } = useSocket();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; uploading: boolean } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handler = async (payload: NewMessagePayload) => {
      if (payload.senderId !== otherUser.id) return;
      const res = await fetch(`/api/messages/${otherUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
      refreshUnread();
    };
    socket.on("new_message", handler);
    return () => { socket.off("new_message", handler); };
  }, [socket, otherUser.id, refreshUnread]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    setPendingImage({ url: URL.createObjectURL(raw), uploading: true });
    try {
      const file = await compressImage(raw);
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, filename: file.name, folder: "messages" }),
      });
      if (!uploadRes.ok) throw new Error("Upload init failed");
      const { uploadUrl, publicUrl } = await uploadRes.json();
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      setPendingImage({ url: publicUrl, uploading: false });
    } catch {
      setPendingImage(null);
    }
    e.target.value = "";
  };

  const sendMessage = useCallback(async () => {
    const text = content.trim();
    if ((!text && !pendingImage) || sending || pendingImage?.uploading) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: otherUser.id,
          content: text,
          ...(pendingImage ? { imageUrl: pendingImage.url } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setContent("");
        setPendingImage(null);
        // Reset textarea height
        if (inputRef.current) inputRef.current.style.height = "44px";
        inputRef.current?.focus();
      }
    } finally {
      setSending(false);
    }
  }, [content, sending, otherUser.id, pendingImage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.messages.push(msg);
    else grouped.push({ date: d, messages: [msg] });
  }

  const isAdmin = otherUser.role === "ADMIN";

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-bg-border bg-bg-surface px-4 py-3 flex items-center gap-3">
        <Link href={backHref} className="text-text-muted hover:text-text-primary transition-colors p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>

        <Avatar user={otherUser} size={9} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm truncate">
              {otherUser.displayName ?? otherUser.username}
            </span>
            {isAdmin && (
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-neon-red bg-neon-red/10 border border-neon-red/20 px-1.5 py-0.5 rounded-full">
                <ShieldCheck size={10} /> Admin
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">@{otherUser.username}</p>
        </div>
      </div>

      {/* ── Message list ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">Say hello 👋</p>
          </div>
        )}

        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date} className="space-y-2">

            {/* Date divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-bg-border" />
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide shrink-0">
                {date}
              </span>
              <div className="flex-1 h-px bg-bg-border" />
            </div>

            {/* Messages */}
            {dayMsgs.map((msg, idx) => {
              const isMe = msg.senderId === myId;
              const prevMsg = idx > 0 ? dayMsgs[idx - 1] : null;
              const isGrouped = prevMsg?.senderId === msg.senderId;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2",
                    isMe ? "flex-row-reverse" : "flex-row",
                    isGrouped ? "mt-0.5" : "mt-3"
                  )}
                >
                  {/* Avatar — only show on last in group or single message */}
                  {!isMe && (
                    <div className="shrink-0 w-7">
                      {!isGrouped && <Avatar user={otherUser} size={7} />}
                    </div>
                  )}

                  {/* Bubble + time */}
                  <div className={cn("flex flex-col gap-1 min-w-0", isMe ? "items-end" : "items-start")} style={{ maxWidth: "72%" }}>
                    <div
                      className={cn(
                        "rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "bg-neon-blue/15 border border-neon-blue/25 text-text-primary rounded-br-md"
                          : "bg-bg-elevated border border-bg-border text-text-primary rounded-bl-md",
                        msg.imageUrl && !msg.content ? "p-1.5" : "px-4 py-2.5"
                      )}
                    >
                      {msg.imageUrl && (
                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={msg.imageUrl}
                            alt="Shared image"
                            className={cn(
                              "rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity w-full",
                              msg.content ? "mb-2" : ""
                            )}
                            style={{ maxHeight: "220px" }}
                          />
                        </a>
                      )}
                      {msg.content && (
                        <p
                          className="whitespace-pre-wrap"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {msg.content}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted px-1 tabular-nums">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t border-bg-border bg-bg-surface px-3 py-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {/* Image preview */}
        {pendingImage && (
          <div className="mb-2.5 inline-block relative">
            <img
              src={pendingImage.url}
              alt="Preview"
              className={cn(
                "h-20 w-32 object-cover rounded-xl border border-bg-border",
                pendingImage.uploading && "opacity-40"
              )}
            />
            {pendingImage.uploading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-text-muted font-medium">
                Uploading…
              </div>
            )}
            {!pendingImage.uploading && (
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neon-red text-white flex items-center justify-center shadow"
              >
                <X size={10} />
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Attach image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-bg-elevated border border-bg-border text-text-muted flex items-center justify-center hover:border-neon-blue/40 hover:text-neon-blue transition-colors shrink-0 touch-manipulation"
            title="Attach image"
          >
            <ImagePlus size={15} />
          </button>

          {/* Textarea */}
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = "44px";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className="w-full resize-none bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/40 transition-colors overflow-y-auto"
              style={{ minHeight: "44px", maxHeight: "140px" }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => void sendMessage()}
            disabled={(!content.trim() && !pendingImage) || sending || pendingImage?.uploading}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 touch-manipulation transition-all",
              content.trim() || pendingImage
                ? "bg-neon-blue/20 border border-neon-blue/40 text-neon-blue hover:bg-neon-blue/30"
                : "bg-bg-elevated border border-bg-border text-text-muted opacity-40 cursor-not-allowed"
            )}
          >
            <Send size={15} className={sending ? "animate-pulse" : ""} />
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
