"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Clock, CheckCircle } from "lucide-react";

interface Props {
  currentMinutes: number;
}

export function ChallengeWindowSettings({ currentMinutes }: Props) {
  const [minutes, setMinutes] = useState(String(currentMinutes));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSaved(false);
    const val = parseInt(minutes, 10);
    if (!val || val < 5 || val > 10080) {
      setError("Must be between 5 and 10080 minutes");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/config/challenge-window", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutesWindow: val }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "Failed to save");
    }
  };

  const hours = Math.floor(currentMinutes / 60);
  const mins = currentMinutes % 60;
  const displayLabel = hours > 0
    ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}`
    : `${currentMinutes}m`;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Clock size={14} className="text-neon-purple" />
          Result Submission Window
        </h2>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-text-muted mb-3">
          How long players have to submit their results after the scheduled match time.
          Currently <span className="text-text-primary font-medium">{displayLabel}</span>.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              min={5}
              max={10080}
              className="w-24 px-3 py-1.5 text-sm bg-bg-elevated border border-bg-border rounded-lg text-text-primary focus:outline-none focus:border-neon-purple"
            />
            <span className="text-sm text-text-muted">minutes</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void handleSave()} loading={saving}>
            Save
          </Button>
          {saved && (
            <span className="text-xs text-neon-green flex items-center gap-1">
              <CheckCircle size={12} /> Saved
            </span>
          )}
        </div>
        {error && <p className="text-xs text-neon-red mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
