"use client";

import { useState } from "react";
import { MailWarning, Loader2, CheckCircle } from "lucide-react";

export function VerificationBanner({ justVerified }: { justVerified: boolean }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (justVerified) return null;

  async function resend() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send"); return; }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-neon-yellow/5 border border-neon-yellow/30 rounded-xl px-4 py-3">
      <MailWarning size={16} className="text-neon-yellow shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neon-yellow font-medium">
          Your email address is not verified
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          You won&apos;t be able to create listings or make payments until you verify your email.
          Check your inbox for the verification email we sent when you signed up.
        </p>
        {error && <p className="text-xs text-neon-red mt-1">{error}</p>}
      </div>
      {sent ? (
        <div className="flex items-center gap-1.5 text-neon-green text-xs font-medium shrink-0">
          <CheckCircle size={14} />
          Email sent!
        </div>
      ) : (
        <button
          onClick={resend}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-neon-yellow border border-neon-yellow/40 px-3 py-1.5 rounded-lg hover:bg-neon-yellow/10 disabled:opacity-50 transition-colors"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          Resend verification email
        </button>
      )}
    </div>
  );
}
