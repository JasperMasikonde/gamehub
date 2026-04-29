"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Swords, Camera, Upload, Loader2, X, Trophy, Wallet, CreditCard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PaymentPanel } from "@/components/payments/PaymentPanel";
import { WalletPayButton } from "@/components/wallet/WalletPayButton";
import { formatCurrency, formatChallengeFormat } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function AcceptChallengePanel({
  challengeId,
  wagerAmount,
  format,
  hostId,
  isLoggedIn,
  savedWhatsapp,
}: {
  challengeId: string;
  wagerAmount: string;
  format: string;
  hostId: string;
  isLoggedIn: boolean;
  savedWhatsapp: string | null;
}) {
  const router = useRouter();
  const [squadUpload, setSquadUpload] = useState<{ url: string; previewUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<"wallet" | "mpesa">("wallet");
  const [feeInfo, setFeeInfo] = useState<{ fee: number | null; transactionFee?: number; totalFee?: number } | null>(null);
  const [whatsapp, setWhatsapp] = useState(savedWhatsapp ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      router.push(`/login?next=/challenges/${challengeId}`);
    }
  }, [isLoggedIn, challengeId, router]);

  // Fetch fee breakdown once on mount
  useEffect(() => {
    const w = parseFloat(wagerAmount);
    if (!w || w <= 0) return;
    fetch(`/api/challenges/fee?wager=${w}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setFeeInfo(d))
      .catch(() => {});
  }, [wagerAmount]);

  if (!isLoggedIn) return null;

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

  const formatLabel = formatChallengeFormat(format);

  // ── Step 2: Payment ─────────────────────────────────────────────────────
  if (showPayment && squadUpload) {
    return (
      <div className="border border-neon-purple/30 bg-neon-purple/5 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs text-text-muted font-medium mb-0.5">Step 2 of 2</p>
          <p className="text-sm font-semibold text-neon-purple flex items-center gap-2">
            <Swords size={14} />
            Pay wager to confirm your spot
          </p>
          <p className="text-xs text-text-muted mt-1">
            {formatLabel} · Wager: <span className="text-neon-green font-semibold">{formatCurrency(wagerAmount)}</span>
          </p>
        </div>

        {/* Payment method tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setPayMethod("wallet")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              payMethod === "wallet"
                ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
                : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            <Wallet size={12} /> Wallet
          </button>
          <button
            onClick={() => setPayMethod("mpesa")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              payMethod === "mpesa"
                ? "border-neon-green bg-neon-green/10 text-neon-green"
                : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            <CreditCard size={12} /> M-Pesa
          </button>
        </div>

        {payMethod === "wallet" ? (
          <WalletPayButton
            challengeId={challengeId}
            wagerAmount={Number(wagerAmount)}
            role="challenger"
            challengerSquadUrl={squadUpload.url}
            whatsappNumber={whatsapp.trim() || undefined}
            onSuccess={() => router.push(`/challenges/${challengeId}`)}
          />
        ) : (
          <PaymentPanel
            purpose="challenge"
            entityId={challengeId}
            amount={Number(wagerAmount)}
            metadata={{ challengerSquadUrl: squadUpload.url, hostId, whatsappNumber: whatsapp.trim() || undefined }}
            onSuccess={() => router.push(`/challenges/${challengeId}`)}
            returnUrl={`/challenges/${challengeId}`}
            returnLabel="Back to challenge"
            hideQrSection
          />
        )}

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
    <div className="border-2 border-neon-purple/40 bg-neon-purple/5 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-text-muted font-medium mb-0.5">Step 1 of 2</p>
        <p className="text-base font-bold text-neon-purple flex items-center gap-2">
          <Swords size={16} />
          Accept this Challenge
        </p>
        <p className="text-xs text-text-muted mt-1">
          {formatLabel} · Match wager: <span className="text-neon-green font-semibold">{formatCurrency(wagerAmount)}</span>
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-bg-elevated rounded-lg px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-text-primary">How to join:</p>
        <p className="text-xs text-text-muted">① Upload a screenshot of your eFootball squad</p>
        <p className="text-xs text-text-muted">② Pay the wager via M-Pesa to confirm your spot</p>
        <p className="text-xs text-text-muted">③ The match begins — chat with your opponent in the challenge room</p>
      </div>

      {/* Payout breakdown */}
      <div className="rounded-xl border border-neon-green/20 bg-neon-green/5 px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Each player pays</span>
          <span className="font-medium text-text-primary">{formatCurrency(wagerAmount)}</span>
        </div>
        <div className="flex justify-between text-xs text-text-muted">
          <span>Total prize pool</span>
          <span className="font-medium text-text-primary">{formatCurrency((parseFloat(wagerAmount) * 2).toString())}</span>
        </div>
        {feeInfo?.fee != null && feeInfo.fee > 0 && (
          <div className="flex justify-between text-xs text-text-muted">
            <span>Platform fee</span>
            <span className="font-medium text-neon-red">− {formatCurrency(feeInfo.fee.toString())}</span>
          </div>
        )}
        {feeInfo?.transactionFee != null && feeInfo.transactionFee > 0 && (
          <div className="flex justify-between text-xs text-text-muted">
            <span>Transaction fee (M-Pesa payout)</span>
            <span className="font-medium text-neon-red">− {formatCurrency(feeInfo.transactionFee.toString())}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold border-t border-neon-green/20 pt-1.5">
          <span className="flex items-center gap-1 text-neon-green"><Trophy size={12} /> You receive if you win</span>
          <span className="text-neon-green">
            {formatCurrency(((parseFloat(wagerAmount) * 2) - (feeInfo?.totalFee ?? feeInfo?.fee ?? 0)).toString())}
          </span>
        </div>
      </div>

      {/* Squad upload */}
      <div>
        <p className="text-xs font-medium text-text-primary mb-2">
          <Camera size={11} className="inline mr-1" />
          Your squad screenshot <span className="text-neon-red">*</span>
          <span className="text-text-muted font-normal ml-1">— so your opponent can verify your team</span>
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
            className="w-full h-24 rounded-lg border-2 border-dashed border-neon-purple/30 hover:border-neon-purple flex flex-col items-center justify-center gap-1.5 text-neon-purple/60 hover:text-neon-purple transition-colors"
          >
            {uploading
              ? <><Loader2 size={16} className="animate-spin" /><span className="text-xs">Uploading…</span></>
              : <><Upload size={18} /><span className="text-xs font-medium">Tap to upload squad screenshot</span></>}
          </button>
        )}
      </div>

      {/* WhatsApp */}
      <div>
        <p className="text-xs font-medium text-text-primary mb-2">
          <MessageCircle size={11} className="inline mr-1 text-neon-green" />
          WhatsApp number <span className="text-neon-red">*</span>
          {savedWhatsapp && <span className="ml-2 text-text-muted font-normal">(saved)</span>}
        </p>
        <Input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="e.g. 0712 345 678"
          required
        />
        <p className="text-[11px] text-text-muted mt-1">
          We&apos;ll notify you on WhatsApp when the match is confirmed.
        </p>
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={() => {
          if (!squadUpload) { setError("Upload your squad screenshot first"); return; }
          if (!whatsapp.trim()) { setError("WhatsApp number is required"); return; }
          setError("");
          setShowPayment(true);
        }}
      >
        <Swords size={14} />
        {squadUpload ? "Continue to Payment →" : "Upload Squad to Continue"}
      </Button>
    </div>
  );
}
