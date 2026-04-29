"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trophy, AlertTriangle, Upload, Loader2, X, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type MatchResult = "HOST_WIN" | "CHALLENGER_WIN";

export function SubmitResultPanel({
  challengeId,
  isHost,
  alreadySubmitted,
  myName,
  opponentName,
}: {
  challengeId: string;
  isHost: boolean;
  alreadySubmitted: boolean;
  myName: string;
  opponentName: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<MatchResult | null>(null);
  const [screenshot, setScreenshot] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The result value that means "I won"
  const myWinValue: MatchResult = isHost ? "HOST_WIN" : "CHALLENGER_WIN";
  const opponentWinValue: MatchResult = isHost ? "CHALLENGER_WIN" : "HOST_WIN";

  const selectedLabel = selected
    ? selected === myWinValue
      ? `${myName} won`
      : `${opponentName} won`
    : null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Only JPEG, PNG or WebP images allowed");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!res.ok) { setUploadError("Upload failed"); setUploading(false); return; }
      const { uploadUrl, publicUrl } = await res.json();
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) { setUploadError("Upload to storage failed"); setUploading(false); return; }
      setScreenshot({ url: publicUrl, preview: URL.createObjectURL(file) });
    } catch {
      setUploadError("Upload failed");
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!selected || !screenshot) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/submit-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: selected, screenshotUrl: screenshot.url }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit"); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  // ── Already submitted ──────────────────────────────────────────────────────
  if (alreadySubmitted) {
    return (
      <div className="bg-neon-yellow/5 border border-neon-yellow/20 rounded-xl p-4 text-center">
        <CheckCircle size={16} className="text-neon-yellow mx-auto mb-2" />
        <p className="text-sm font-medium text-neon-yellow">Result submitted</p>
        <p className="text-xs text-text-muted mt-1">Waiting for your opponent to submit their result.</p>
      </div>
    );
  }

  return (
    <div className="border border-neon-green/30 bg-neon-green/5 rounded-xl p-5 space-y-4">

      {/* Header */}
      <div>
        <p className="text-sm font-bold text-neon-green flex items-center gap-2">
          <Trophy size={14} />
          Submit Match Result
        </p>
        <p className="text-xs text-text-muted mt-0.5">Select who won, then upload your scoreboard screenshot.</p>
      </div>

      {/* ── Warning ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-neon-red/8 border border-neon-red/25">
        <AlertTriangle size={13} className="text-neon-red shrink-0 mt-0.5" />
        <p className="text-xs text-neon-red leading-relaxed">
          <span className="font-semibold">Wrong submissions freeze both wagers</span> until an admin resolves the dispute. Double-check before submitting.
        </p>
      </div>

      {/* ── Step 1: Select winner ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-primary uppercase tracking-wide">Who won?</p>
        <div className="grid grid-cols-2 gap-3">
          {/* I won */}
          <button
            type="button"
            onClick={() => { setSelected(myWinValue); setConfirmed(false); }}
            className={cn(
              "flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all text-center",
              selected === myWinValue
                ? "border-neon-green bg-neon-green/12 shadow-[0_0_16px_rgba(0,255,135,0.15)]"
                : "border-bg-border bg-bg-elevated hover:border-neon-green/40"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black",
              selected === myWinValue ? "bg-neon-green/20 text-neon-green" : "bg-bg-surface text-text-muted"
            )}>
              {myName[0]?.toUpperCase()}
            </div>
            <div>
              <p className={cn(
                "text-xs font-bold truncate max-w-[90px]",
                selected === myWinValue ? "text-neon-green" : "text-text-primary"
              )}>
                {myName}
              </p>
              <p className={cn(
                "text-[10px] font-medium",
                selected === myWinValue ? "text-neon-green/80" : "text-text-muted"
              )}>
                <Trophy size={9} className="inline mr-0.5" />
                I won
              </p>
            </div>
            {selected === myWinValue && (
              <CheckCircle size={14} className="text-neon-green" />
            )}
          </button>

          {/* Opponent won */}
          <button
            type="button"
            onClick={() => { setSelected(opponentWinValue); setConfirmed(false); }}
            className={cn(
              "flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all text-center",
              selected === opponentWinValue
                ? "border-neon-red bg-neon-red/8 shadow-[0_0_16px_rgba(255,59,92,0.15)]"
                : "border-bg-border bg-bg-elevated hover:border-neon-red/40"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black",
              selected === opponentWinValue ? "bg-neon-red/20 text-neon-red" : "bg-bg-surface text-text-muted"
            )}>
              {opponentName[0]?.toUpperCase()}
            </div>
            <div>
              <p className={cn(
                "text-xs font-bold truncate max-w-[90px]",
                selected === opponentWinValue ? "text-neon-red" : "text-text-primary"
              )}>
                {opponentName}
              </p>
              <p className={cn(
                "text-[10px] font-medium",
                selected === opponentWinValue ? "text-neon-red/80" : "text-text-muted"
              )}>
                They won
              </p>
            </div>
            {selected === opponentWinValue && (
              <CheckCircle size={14} className="text-neon-red" />
            )}
          </button>
        </div>
      </div>

      {/* ── Step 2: Screenshot (shown once winner selected) ──────────────────── */}
      {selected && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-primary uppercase tracking-wide flex items-center gap-1">
            <Camera size={11} />
            Scoreboard screenshot <span className="text-neon-red">*</span>
          </p>
          <p className="text-[11px] text-text-muted">
            Upload a screenshot showing the final score. This is your evidence if a dispute arises.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
          {screenshot ? (
            <div className="relative w-full group">
              <img
                src={screenshot.preview}
                alt="Scoreboard"
                className="w-full max-h-48 object-contain rounded-lg border border-neon-green/30 bg-bg-surface"
              />
              <button
                type="button"
                onClick={() => { setScreenshot(null); setConfirmed(false); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={11} />
              </button>
              <div className="flex items-center gap-1 mt-1.5 text-[11px] text-neon-green">
                <CheckCircle size={11} />
                Screenshot uploaded
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-24 rounded-xl border-2 border-dashed border-neon-green/30 hover:border-neon-green flex flex-col items-center justify-center gap-1.5 text-neon-green/60 hover:text-neon-green transition-colors"
            >
              {uploading
                ? <><Loader2 size={16} className="animate-spin" /><span className="text-xs">Uploading…</span></>
                : <><Upload size={18} /><span className="text-xs font-medium">Tap to upload scoreboard screenshot</span></>
              }
            </button>
          )}
          {uploadError && <p className="text-xs text-neon-red">{uploadError}</p>}
        </div>
      )}

      {/* ── Step 3: Confirmation (shown once screenshot uploaded) ────────────── */}
      {selected && screenshot && (
        <div className={cn(
          "rounded-xl border p-4 space-y-3",
          confirmed
            ? "border-neon-green/40 bg-neon-green/8"
            : "border-bg-border bg-bg-elevated"
        )}>
          <div className="flex items-start gap-2.5">
            <input
              id="result-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-neon-green shrink-0 cursor-pointer"
            />
            <label htmlFor="result-confirm" className="text-xs text-text-primary leading-relaxed cursor-pointer">
              I confirm that{" "}
              <span className={cn(
                "font-bold",
                selected === myWinValue ? "text-neon-green" : "text-neon-red"
              )}>
                {selectedLabel}
              </span>
              {" "}and this screenshot is from our match. I understand this cannot be changed after submission.
            </label>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={submit}
        loading={loading}
        disabled={!selected || !screenshot || !confirmed}
      >
        <Trophy size={14} />
        Submit Result — {selectedLabel ?? "select a winner first"}
      </Button>
    </div>
  );
}
