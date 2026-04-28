"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Swords, Banknote, Camera, Upload, Loader2, X, ArrowRight, FileText, Trophy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

export function CreateChallengeForm({ savedWhatsapp }: { savedWhatsapp: string | null }) {
  const router = useRouter();
  const [format, setFormat] = useState<"BEST_OF_3" | "BEST_OF_5">("BEST_OF_3");
  const [wager, setWager] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState(savedWhatsapp ?? "");
  const [squadUpload, setSquadUpload] = useState<{ url: string; previewUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [feeInfo, setFeeInfo] = useState<{ fee: number | null; transactionFee?: number; totalFee?: number } | null>(null);
  const [wagerLimits, setWagerLimits] = useState<{ minWagerAmount: number; maxWagerAmount: number | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch wager limits on mount
  useEffect(() => {
    fetch("/api/challenges/wager-limits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setWagerLimits(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const w = parseFloat(wager);
    if (!w || w <= 0) { setFeeInfo(null); return; }
    if (feeTimerRef.current) clearTimeout(feeTimerRef.current);
    feeTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/challenges/fee?wager=${w}`);
        if (res.ok) setFeeInfo(await res.json());
      } catch { /* ignore */ }
    }, 400);
    return () => { if (feeTimerRef.current) clearTimeout(feeTimerRef.current); };
  }, [wager]);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!squadUpload) { setError("Squad screenshot is required"); return; }
    const w = parseFloat(wager);
    if (!w || w <= 0) { setError("Enter a valid wager amount"); return; }
    if (!whatsapp.trim()) { setError("WhatsApp number is required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, wagerAmount: w, description, hostSquadUrl: squadUpload.url, whatsappNumber: whatsapp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create challenge"); return; }
      router.push(`/challenges/${data.challenge.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Format */}
      <div>
        <label className="block text-sm font-medium mb-3">Match Format</label>
        <div className="grid grid-cols-2 gap-3">
          {(["BEST_OF_3", "BEST_OF_5"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={cn(
                "px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left",
                format === f
                  ? "border-neon-purple bg-neon-purple/10 text-neon-purple"
                  : "border-bg-border text-text-muted hover:border-bg-border/80"
              )}
            >
              <Swords size={14} className="inline mr-2" />
              {f === "BEST_OF_3" ? "Best of 3" : "Best of 5"}
              <p className="text-[11px] font-normal mt-0.5 opacity-70">
                {f === "BEST_OF_3" ? "First to win 2 matches" : "First to win 3 matches"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Squad screenshot — required */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <Camera size={13} className="inline mr-1" />
          Your Squad Screenshot <span className="text-neon-red">*</span>
        </label>
        <p className="text-xs text-text-muted mb-3">
          Show the squad you will use in this challenge. This is visible to your opponent.
        </p>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        {squadUpload ? (
          <div className="relative w-full max-w-xs group">
            <img src={squadUpload.previewUrl} alt="Squad" className="w-full aspect-video object-cover rounded-xl border border-neon-green/40" />
            <button
              type="button"
              onClick={() => setSquadUpload(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full max-w-xs h-32 rounded-xl border-2 border-dashed border-neon-purple/40 hover:border-neon-purple flex flex-col items-center justify-center gap-2 text-neon-purple/60 hover:text-neon-purple transition-colors"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <><Upload size={20} /><span className="text-xs">Upload squad screenshot</span></>}
          </button>
        )}
      </div>

      {/* Wager */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Banknote size={13} className="inline mr-1" />
          Wager Amount (KSh)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium pointer-events-none">KSh</span>
          <Input
            type="number"
            min={wagerLimits?.minWagerAmount ?? 1}
            max={wagerLimits?.maxWagerAmount ?? undefined}
            step="1"
            value={wager}
            onChange={(e) => setWager(e.target.value)}
            placeholder="0"
            required
            className="pl-12"
          />
        </div>
        <p className="text-xs text-text-muted mt-1">
          Your opponent must match this amount to accept.
          {wagerLimits && (
            <span className="ml-1">
              {wagerLimits.minWagerAmount > 0 && `Min: KES ${wagerLimits.minWagerAmount.toLocaleString()}`}
              {wagerLimits.maxWagerAmount && ` · Max: KES ${wagerLimits.maxWagerAmount.toLocaleString()}`}
            </span>
          )}
        </p>

        {feeInfo && parseFloat(wager) > 0 && (
          <div className="mt-3 rounded-xl border border-neon-green/20 bg-neon-green/5 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs text-text-muted">
              <span>Each player pays</span>
              <span className="font-medium text-text-primary">{formatCurrency(wager)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span>Total prize pool</span>
              <span className="font-medium text-text-primary">{formatCurrency((parseFloat(wager) * 2).toString())}</span>
            </div>
            {feeInfo.fee != null && feeInfo.fee > 0 && (
              <div className="flex justify-between text-xs text-text-muted">
                <span>Platform fee</span>
                <span className="font-medium text-neon-red">− {formatCurrency(feeInfo.fee.toString())}</span>
              </div>
            )}
            {feeInfo.transactionFee != null && feeInfo.transactionFee > 0 && (
              <div className="flex justify-between text-xs text-text-muted">
                <span>Transaction fee (M-Pesa payout)</span>
                <span className="font-medium text-neon-red">− {formatCurrency(feeInfo.transactionFee.toString())}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-neon-green/20 pt-1.5">
              <span className="flex items-center gap-1 text-neon-green"><Trophy size={12} /> Winner receives</span>
              <span className="text-neon-green">
                {formatCurrency(((parseFloat(wager) * 2) - (feeInfo.totalFee ?? feeInfo.fee ?? 0)).toString())}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <FileText size={13} className="inline mr-1" />
          Challenge Note (optional)
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any rules, division requirements, time preferences…"
          rows={3}
          maxLength={500}
        />
      </div>

      {/* WhatsApp */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <MessageCircle size={13} className="inline mr-1 text-neon-green" />
          WhatsApp number <span className="text-neon-red">*</span>
          {savedWhatsapp && <span className="ml-2 text-xs text-text-muted font-normal">(saved)</span>}
        </label>
        <Input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="e.g. 0712 345 678"
          required
        />
        <p className="text-xs text-text-muted mt-1">
          We&apos;ll message you on WhatsApp when an opponent accepts your challenge.
        </p>
      </div>

      {/* Info */}
      <div className="flex gap-3 p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
        <Swords size={16} className="text-neon-purple shrink-0 mt-0.5" />
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="text-neon-purple font-semibold">How wagers work: </span>
          Both parties commit their wager. After the match, each submits the result. If they agree, the winner is confirmed. If not, an admin reviews the dispute.
        </p>
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/5 border border-neon-red/20 rounded-lg px-4 py-2.5">{error}</p>
      )}

      <Button type="submit" variant="primary" className="w-full" disabled={loading || !squadUpload}>
        {loading ? "Creating…" : <><Swords size={15} /> Post Challenge <ArrowRight size={15} /></>}
      </Button>
    </form>
  );
}
