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

export function ConversationView({
  initialMessages,
  otherUser,
  myId,
}: {
  initialMessages: Message[];
  otherUser: OtherUser;
  myId: string;
}) {
  const { socket, refreshUnread } = useSocket();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; uploading: boolean } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for new messages on the socket
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

    // Show preview immediately using the original file
    const localUrl = URL.createObjectURL(raw);
    setPendingImage({ url: localUrl, uploading: true });

    try {
      const file = await compressImage(raw);
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, filename: file.name, folder: "messages" }),
      });
      if (!uploadRes.ok) throw new Error("Upload init failed");
      const { uploadUrl, publicUrl } = await uploadRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setPendingImage({ url: publicUrl, uploading: false });
    } catch {
      setPendingImage(null);
    }
    // Reset file input
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
        inputRef.current?.focus();
      }
    } finally {
      setSending(false);
    }
  }, [content, sending, otherUser.id, pendingImage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: d, messages: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b border-bg-border bg-bg-surface/80 backdrop-blur px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/messages" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>

        <div className="w-9 h-9 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center overflow-hidden">
          {otherUser.avatarUrl ? (
            <img src={otherUser.avatarUrl} alt={otherUser.username} className="w-full h-full object-cover" />
          ) : (
            <User size={16} className="text-text-muted" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">
              {otherUser.displayName ?? otherUser.username}
            </span>
            {otherUser.role === "ADMIN" && (
              <ShieldCheck size={13} className="text-neon-red shrink-0" />
            )}
          </div>
          <p className="text-xs text-text-muted">@{otherUser.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-text-muted text-sm py-10">
            No messages yet. Say hi!
          </div>
        )}

        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date}>
            <div className="text-center text-xs text-text-muted my-3">
              <span className="px-3 py-1 rounded-full bg-bg-elevated border border-bg-border">
                {date}
              </span>
            </div>

            <div className="space-y-2">
              {dayMsgs.map((msg) => {
                const isMe = msg.senderId === myId;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
                  >
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center overflow-hidden shrink-0 mt-auto">
                        {otherUser.avatarUrl ? (
                          <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={13} className="text-text-muted" />
                        )}
                      </div>
                    )}
                    <div className={cn("max-w-xs lg:max-w-md", isMe ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                      <div
                        className={cn(
                          "rounded-2xl text-sm leading-relaxed",
                          isMe
                            ? "bg-neon-blue/20 border border-neon-blue/30 text-text-primary rounded-br-sm"
                            : "bg-bg-elevated border border-bg-border text-text-primary rounded-bl-sm",
                          msg.imageUrl && !msg.content ? "p-1" : "px-3.5 py-2.5"
                        )}
                      >
                        {msg.imageUrl && (
                          <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={msg.imageUrl}
                              alt="Shared image"
                              className="max-w-full rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ maxHeight: "240px" }}
                            />
                          </a>
                        )}
                        {msg.content && (
                          <p className={cn("break-words", msg.imageUrl ? "mt-2 px-2 pb-1" : "")}>
                            {msg.content}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-bg-border bg-bg-surface/80 backdrop-blur px-4 py-3 shrink-0">
        {/* Image preview */}
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            <img
              src={pendingImage.url}
              alt="Preview"
              className={cn(
                "h-20 w-32 object-cover rounded-lg border border-bg-border",
                pendingImage.uploading && "opacity-50"
              )}
            />
            {pendingImage.uploading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-text-muted">
                Uploading…
              </div>
            )}
            {!pendingImage.uploading && (
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neon-red text-white flex items-center justify-center"
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-bg-elevated border border-bg-border text-text-muted flex items-center justify-center hover:border-neon-blue/40 hover:text-neon-blue transition-colors shrink-0"
            title="Attach image"
          >
            <ImagePlus size={16} />
          </button>

          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/40 transition-colors max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={sendMessage}
            disabled={(!content.trim() && !pendingImage) || sending || pendingImage?.uploading}
            className="w-10 h-10 rounded-xl bg-neon-blue/20 border border-neon-blue/30 text-neon-blue flex items-center justify-center hover:bg-neon-blue/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
