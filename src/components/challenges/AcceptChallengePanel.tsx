"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Swords, Camera, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentPanel } from "@/components/payments/PaymentPanel";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function AcceptChallengePanel({
  challengeId,
  wagerAmount,
  format,
  hostId,
}: {
  challengeId: string;
  wagerAmount: string;
  format: string;
  hostId: string;
}) {
  const router = useRouter();
  const [squadUpload, setSquadUpload] = useState<{ url: string; previewUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG or WebP images allowed");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Upload failed"); setUploading(false); return; }
      const { uploadUrl, publicUrl } = await res.json();
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) { setError("Upload to storage failed"); setUploading(false); return; }
      setSquadUpload({ url: publicUrl, previewUrl: URL.createObjectURL(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — check server logs");
    }
    setUploading(false);
  };

  const formatLabel = format === "BEST_OF_3" ? "Best of 3" : "Best of 5";

  // ── Step 2: Payment ─────────────────────────────────────────────────────
  if (showPayment && squadUpload) {
    return (
      <div className="border border-neon-purple/30 bg-neon-purple/5 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-neon-purple flex items-center gap-2">
            <Swords size={14} />
            Pay wager to accept challenge
          </p>
          <p className="text-xs text-text-muted mt-1">
            {formatLabel} · Wager: <span className="text-neon-green font-semibold">{formatCurrency(wagerAmount)}</span>
          </p>
        </div>
        <PaymentPanel
          purpose="challenge"
          entityId={challengeId}
          amount={Number(wagerAmount)}
          metadata={{ challengerSquadUrl: squadUpload.url, hostId }}
          onSuccess={() => router.refresh()}
        />
        <button
          onClick={() => setShowPayment(false)}
          className="text-xs text-text-muted hover:text-text-primary underline"
        >
          ← Change squad screenshot
        </button>
      </div>
    );
  }

  // ── Step 1: Squad upload ────────────────────────────────────────────────
  return (
    <div className="border border-neon-purple/30 bg-neon-purple/5 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-neon-purple flex items-center gap-2">
          <Swords size={14} />
          Accept this Challenge
        </p>
        <p className="text-xs text-text-muted mt-1">
          {formatLabel} · Wager: <span className="text-neon-green font-semibold">{formatCurrency(wagerAmount)}</span>
        </p>
      </div>

      {/* Squad upload */}
      <div>
        <p className="text-xs font-medium text-text-primary mb-2">
          <Camera size={11} className="inline mr-1" />
          Upload your squad screenshot <span className="text-neon-red">*</span>
        </p>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        {squadUpload ? (
          <div className="relative w-48 group">
            <img src={squadUpload.previewUrl} alt="Your squad" className="w-full aspect-video object-cover rounded-lg border border-neon-purple/40" />
            <button
              type="button"
              onClick={() => setSquadUpload(null)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-48 h-24 rounded-lg border-2 border-dashed border-neon-purple/30 hover:border-neon-purple flex flex-col items-center justify-center gap-1.5 text-neon-purple/60 hover:text-neon-purple transition-colors"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <><Upload size={16} /><span className="text-xs">Upload squad</span></>}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={() => { if (!squadUpload) { setError("Upload your squad screenshot first"); return; } setError(""); setShowPayment(true); }}
        disabled={!squadUpload}
      >
        <Swords size={14} />
        Continue to Payment
      </Button>
    </div>
  );
}
