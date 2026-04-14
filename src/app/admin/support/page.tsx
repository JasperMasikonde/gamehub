"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Inbox,
  RefreshCw,
  Trash2,
  Reply,
  ChevronLeft,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupportEmail {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  isRead: boolean;
  repliedAt: string | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

// ─── Inbox list ──────────────────────────────────────────────────────────────

function EmailList({
  emails,
  selected,
  onSelect,
  onRefresh,
  loading,
}: {
  emails: SupportEmail[];
  selected: string | null;
  onSelect: (e: SupportEmail) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const unread = emails.filter((e) => !e.isRead).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border shrink-0">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Inbox size={14} className="text-neon-blue" /> Inbox
            {unread > 0 && (
              <span className="text-[10px] font-bold bg-neon-red text-white rounded-full px-1.5 py-0.5 leading-none">
                {unread}
              </span>
            )}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">{emails.length} emails</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-bg-border">
        {emails.length === 0 && (
          <p className="text-center text-sm text-text-muted py-10">No emails yet</p>
        )}
        {emails.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e)}
            className={cn(
              "w-full text-left px-4 py-3 transition-colors hover:bg-bg-elevated/70",
              selected === e.id && "bg-neon-blue/5 border-l-2 border-neon-blue",
              !e.isRead && "bg-bg-elevated/30"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {!e.isRead && <Circle size={6} className="text-neon-blue fill-neon-blue shrink-0 mt-0.5" />}
                <p className={cn("text-xs truncate", !e.isRead ? "font-semibold text-text-primary" : "text-text-muted")}>
                  {e.fromName ?? e.fromEmail}
                </p>
              </div>
              <span className="text-[10px] text-text-muted shrink-0">{formatDate(e.createdAt)}</span>
            </div>
            <p className={cn("text-xs truncate mt-0.5", !e.isRead ? "text-text-primary" : "text-text-muted")}>
              {e.subject}
            </p>
            {e.repliedAt && (
              <span className="text-[10px] text-neon-green font-medium">↩ Replied</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Email detail + reply form ────────────────────────────────────────────────

function EmailDetail({
  email,
  onBack,
  onDelete,
  onReplied,
}: {
  email: SupportEmail;
  onBack: () => void;
  onDelete: (id: string) => void;
  onReplied: (id: string) => void;
}) {
  const [replyForm, setReplyForm] = useState({
    replyMessage: "",
    agentName: "",
  });
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email.fromEmail,
          toName: email.fromName ?? email.fromEmail,
          replyMessage: replyForm.replyMessage,
          originalMessage: email.bodyText ?? undefined,
          agentName: replyForm.agentName,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to send");
      }
      // Mark as replied
      await fetch(`/api/admin/support-inbox/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repliedAt: new Date().toISOString(), isRead: true }),
      });
      setSendStatus("sent");
      onReplied(email.id);
      setReplyForm({ replyMessage: "", agentName: "" });
    } catch (err) {
      setSendStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this email from the inbox?")) return;
    setDeleting(true);
    await fetch(`/api/admin/support-inbox/${email.id}`, { method: "DELETE" });
    onDelete(email.id);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors md:hidden"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-neon-red transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="px-6 py-5 space-y-2 border-b border-bg-border">
        <h2 className="text-base font-bold text-text-primary">{email.subject}</h2>
        <div className="text-xs text-text-muted space-y-0.5">
          <p>
            <span className="font-medium text-text-primary">From:</span>{" "}
            {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
          </p>
          <p>
            <span className="font-medium text-text-primary">Received:</span>{" "}
            {new Date(email.createdAt).toLocaleString("en-KE", {
              weekday: "short", year: "numeric", month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
          {email.repliedAt && (
            <p className="text-neon-green font-medium">
              ↩ Replied {new Date(email.repliedAt).toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex-1 border-b border-bg-border">
        {email.bodyText ? (
          <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
            {email.bodyText}
          </pre>
        ) : (
          <p className="text-sm text-text-muted italic">No body content</p>
        )}
      </div>

      {/* Reply form */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Reply size={14} className="text-neon-blue" />
          <h3 className="text-sm font-semibold">Reply to {email.fromName ?? email.fromEmail}</h3>
        </div>

        {sendStatus === "sent" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neon-green/10 border border-neon-green/20 text-neon-green text-xs mb-4">
            <CheckCircle size={13} /> Reply sent successfully!
          </div>
        )}
        {sendStatus === "error" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
            <AlertCircle size={13} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleReply} className="flex flex-col gap-3">
          <textarea
            value={replyForm.replyMessage}
            onChange={(e) => setReplyForm((p) => ({ ...p, replyMessage: e.target.value }))}
            required
            rows={5}
            placeholder="Type your reply..."
            className="px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue resize-none"
          />
          <input
            type="text"
            value={replyForm.agentName}
            onChange={(e) => setReplyForm((p) => ({ ...p, agentName: e.target.value }))}
            required
            placeholder="Your name (e.g. Jasper)"
            className="px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
          />
          <button
            type="submit"
            disabled={sendStatus === "sending"}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neon-blue text-bg-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sendStatus === "sending" ? (
              <><Mail size={14} className="animate-pulse" /> Sending…</>
            ) : (
              <><Send size={14} /> Send Reply</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [emails, setEmails] = useState<SupportEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportEmail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support-inbox");
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectEmail = async (e: SupportEmail) => {
    setSelected(e);
    // Mark as read if not already
    if (!e.isRead) {
      await fetch(`/api/admin/support-inbox/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setEmails((prev) => prev.map((m) => m.id === e.id ? { ...m, isRead: true } : m));
    }
  };

  const handleDelete = (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    setSelected(null);
  };

  const handleReplied = (id: string) => {
    const now = new Date().toISOString();
    setEmails((prev) => prev.map((e) => e.id === id ? { ...e, repliedAt: now, isRead: true } : e));
    setSelected((s) => s && s.id === id ? { ...s, repliedAt: now, isRead: true } : s);
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-xl font-bold">Support Inbox</h1>
        <p className="text-sm text-text-muted">
          Emails sent to support@eshabiki.com appear here.{" "}
          <a
            href="https://resend.com/inbound"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-blue hover:underline"
          >
            Set up inbound routing →
          </a>
        </p>
      </div>

      <Card className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Email list — always visible on desktop, hidden on mobile when email open */}
          <div
            className={cn(
              "w-full md:w-72 md:border-r border-bg-border shrink-0 flex flex-col",
              selected ? "hidden md:flex" : "flex"
            )}
          >
            <EmailList
              emails={emails}
              selected={selected?.id ?? null}
              onSelect={selectEmail}
              onRefresh={load}
              loading={loading}
            />
          </div>

          {/* Detail pane */}
          <div
            className={cn(
              "flex-1 min-w-0",
              selected ? "flex flex-col" : "hidden md:flex items-center justify-center"
            )}
          >
            {selected ? (
              <EmailDetail
                email={selected}
                onBack={() => setSelected(null)}
                onDelete={handleDelete}
                onReplied={handleReplied}
              />
            ) : (
              <div className="text-center text-text-muted">
                <Inbox size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select an email to read it</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
