"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Calendar, Clock, CheckCircle } from "lucide-react";

interface Props {
  challengeId: string;
  scheduledAt: string | null;
  resultDeadlineAt: string | null;
  resultWindowMinutes: number;
}

function formatLocal(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ScheduleMatchPanel({
  challengeId,
  scheduledAt: initialScheduledAt,
  resultDeadlineAt: initialDeadlineAt,
  resultWindowMinutes,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt);
  const [resultDeadlineAt, setResultDeadlineAt] = useState(initialDeadlineAt);
  const [inputValue, setInputValue] = useState(() => {
    if (!initialScheduledAt) return "";
    // Convert to local datetime-local format
    const d = new Date(initialScheduledAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!inputValue) { setError("Please pick a date and time"); return; }
    const date = new Date(inputValue);
    if (date <= new Date()) { setError("Scheduled time must be in the future"); return; }

    setError("");
    setSaving(true);
    const res = await fetch(`/api/challenges/${challengeId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: date.toISOString() }),
    });
    setSaving(false);

    if (res.ok) {
      const data = await res.json() as { challenge: { scheduledAt: string; resultDeadlineAt: string } };
      setScheduledAt(data.challenge.scheduledAt);
      setResultDeadlineAt(data.challenge.resultDeadlineAt);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } else {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "Failed to save");
    }
  };

  const hours = Math.floor(resultWindowMinutes / 60);
  const mins = resultWindowMinutes % 60;
  const windowLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${resultWindowMinutes}m`;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Calendar size={14} className="text-neon-blue" />
          Match Schedule
        </h2>
      </CardHeader>
      <CardContent>
        {scheduledAt ? (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={13} className="text-neon-blue shrink-0" />
              <span className="text-text-muted">Agreed time:</span>
              <span className="text-text-primary font-medium">{formatLocal(scheduledAt)}</span>
            </div>
            {resultDeadlineAt && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Clock size={11} className="shrink-0" />
                Results must be submitted by{" "}
                <span className="text-neon-yellow font-medium">{formatLocal(resultDeadlineAt)}</span>
                <span className="text-text-muted">({windowLabel} window)</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted mb-3">
            Set the agreed match time so both players know when to play. Results must be submitted within {windowLabel} after.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="datetime-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="px-3 py-1.5 text-sm bg-bg-elevated border border-bg-border rounded-lg text-text-primary focus:outline-none focus:border-neon-blue"
          />
          <Button size="sm" variant="secondary" onClick={() => void handleSave()} loading={saving}>
            {scheduledAt ? "Update time" : "Set match time"}
          </Button>
          {saved && (
            <span className="text-xs text-neon-green flex items-center gap-1">
              <CheckCircle size={12} /> Match time saved!
            </span>
          )}
        </div>
        {error && <p className="text-xs text-neon-red mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
