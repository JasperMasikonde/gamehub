"use client";

import { useState } from "react";
import { Bell, Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AdminNotificationEmailForm({
  currentEmail,
}: {
  currentEmail: string | null;
}) {
  const [email, setEmail] = useState(currentEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/config/notification-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotificationEmail: email || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setEmail("");
    setSaved(false);
    setError("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-neon-yellow" />
        <h2 className="text-base font-semibold">Admin Notification Email</h2>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        You&apos;ll receive an email at this address when a <strong>dispute is raised</strong>, a <strong>new listing is submitted</strong>, or a <strong>challenge is completed</strong>.
        Leave blank to disable email notifications.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSaved(false); setError(""); }}
            placeholder="admin@example.com"
            className="pr-8"
          />
          {email && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Button
          variant="primary"
          onClick={save}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : "Save"}
        </Button>
      </div>
      {saved && <p className="text-xs text-neon-green">Saved successfully.</p>}
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}
