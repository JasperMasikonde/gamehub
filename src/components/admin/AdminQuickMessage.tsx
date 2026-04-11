"use client";

import { useState } from "react";
import { MessageSquare, Send, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  userId: string;
  displayName: string;
  challengeId: string;
  defaultMessage?: string;
}

export function AdminQuickMessage({ userId, displayName, challengeId, defaultMessage = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    const text = content.trim();
    if (!text) { setError("Message cannot be empty"); return; }
    setError("");
    setSending(true);
    const res = await fetch(`/api/admin/messages/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setTimeout(() => { setSent(false); setOpen(false); setContent(defaultMessage); }, 2000);
    } else {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "Failed to send");
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <MessageSquare size={13} />
        Message {displayName}
      </Button>
    );
  }

  return (
    <div className="border border-neon-blue/30 bg-neon-blue/5 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare size={13} className="text-neon-blue" />
          Message {displayName}
        </p>
        <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
          <X size={15} />
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={`Write a message to ${displayName}…`}
        className="w-full resize-none bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/40 transition-colors"
      />

      {error && <p className="text-xs text-neon-red">{error}</p>}

      {sent ? (
        <p className="text-xs text-neon-green flex items-center gap-1">
          <CheckCircle size={12} /> Message sent!
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void send()} loading={sending} className="gap-1.5">
            <Send size={12} />
            Send
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
