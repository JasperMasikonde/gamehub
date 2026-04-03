"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";

export default function SupportPage() {
  const [form, setForm] = useState({
    toEmail: "",
    toName: "",
    replyMessage: "",
    originalMessage: "",
    agentName: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          originalMessage: form.originalMessage || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send");
      }

      setStatus("sent");
      setForm({ toEmail: "", toName: "", replyMessage: "", originalMessage: "", agentName: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Support Reply</h1>
        <p className="text-sm text-text-muted">Send a formatted support email to a customer</p>
      </div>

      {status === "sent" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-neon-green/10 border border-neon-green/20 text-neon-green text-sm">
          <CheckCircle size={15} />
          Email sent successfully!
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={15} />
          {errorMsg}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Customer Email</label>
              <input
                type="email"
                name="toEmail"
                value={form.toEmail}
                onChange={handleChange}
                required
                placeholder="customer@example.com"
                className="px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Customer Name</label>
              <input
                type="text"
                name="toName"
                value={form.toName}
                onChange={handleChange}
                required
                placeholder="John"
                className="px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Your Reply</label>
            <textarea
              name="replyMessage"
              value={form.replyMessage}
              onChange={handleChange}
              required
              rows={6}
              placeholder="Type your reply to the customer..."
              className="px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">
              Customer&apos;s Original Message <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              name="originalMessage"
              value={form.originalMessage}
              onChange={handleChange}
              rows={3}
              placeholder="Paste the customer's original message..."
              className="px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Your Name</label>
            <input
              type="text"
              name="agentName"
              value={form.agentName}
              onChange={handleChange}
              required
              placeholder="e.g. Jasper or The Eshabiki Team"
              className="px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neon-blue text-bg-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {status === "sending" ? (
              <>
                <Mail size={15} className="animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                <Send size={15} />
                Send Email
              </>
            )}
          </button>
        </form>
      </Card>
    </div>
  );
}
