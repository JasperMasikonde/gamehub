"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Loader2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentPanel } from "@/components/payments/PaymentPanel";
import { formatCurrency } from "@/lib/utils/format";

interface Props {
  listingId: string;
  price: number;
  currency?: string;
  isLoggedIn: boolean;
}

export function OrderPanel({ listingId, price, currency = "KES", isLoggedIn }: Props) {
  const router = useRouter();
  const [squadUpload, setSquadUpload] = useState<{ url: string; previewUrl: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoggedIn) {
    return (
      <div className="border border-bg-border rounded-xl p-5 text-center space-y-3">
        <p className="text-sm text-text-muted">Sign in to order this service</p>
        <a href="/login">
          <Button variant="primary" className="w-full">Sign In</Button>
        </a>
      </div>
    );
  }

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
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Upload failed");
        setUploading(false);
        return;
      }
      const { uploadUrl, publicUrl } = await res.json();
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        setError("Upload to storage failed");
        setUploading(false);
        return;
      }
      setSquadUpload({ url: publicUrl, previewUrl: URL.createObjectURL(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  };

  const createOrder = async () => {
    if (!squadUpload) {
      setError("Upload your squad screenshot first");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/rank-push/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, squadUrl: squadUpload.url, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create order");
        setSubmitting(false);
        return;
      }
      setOrderId(data.order.id);
      setShowPayment(true);
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  };

  // Step 2: Payment
  if (showPayment && orderId) {
    return (
      <div className="border border-neon-purple/30 bg-neon-purple/5 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs text-text-muted font-medium mb-0.5">Step 2 of 2</p>
          <p className="text-sm font-semibold text-neon-purple">Pay to confirm your order</p>
        </div>
        <PaymentPanel
          purpose="rank_push"
          entityId={orderId}
          amount={price}
          currency={currency}
          onSuccess={() => router.push("/dashboard/rank-push")}
          returnUrl="/dashboard/rank-push"
          returnLabel="Go to dashboard"
        />
        <button
          onClick={() => setShowPayment(false)}
          className="text-xs text-text-muted hover:text-text-primary underline"
        >
          ← Go back
        </button>
      </div>
    );
  }

  // Step 1: Upload + notes
  return (
    <div className="border-2 border-neon-purple/40 bg-neon-purple/5 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-xs text-text-muted font-medium mb-0.5">Step 1 of 2</p>
        <p className="text-base font-bold text-neon-purple">Order this service</p>
        <p className="text-sm font-black text-neon-green mt-1">
          {formatCurrency(String(price), currency)}
        </p>
      </div>

      {/* Squad upload */}
      <div>
        <p className="text-xs font-medium text-text-primary mb-2">
          <Camera size={11} className="inline mr-1" />
          Your squad screenshot <span className="text-neon-red">*</span>
          <span className="text-text-muted font-normal ml-1">
            — so the provider can see your team
          </span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        {squadUpload ? (
          <div className="relative w-48 group">
            <img
              src={squadUpload.previewUrl}
              alt="Your squad"
              className="w-full aspect-video object-cover rounded-lg border border-neon-purple/40"
            />
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
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Uploading…</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span className="text-xs font-medium">Tap to upload squad screenshot</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-text-primary mb-1.5">
          Notes for provider (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. current rank, target rank, any special requirements…"
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-purple/50 transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={createOrder}
        disabled={submitting || uploading}
      >
        {submitting ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Creating order…
          </>
        ) : (
          <>
            <ShieldCheck size={14} />
            {squadUpload ? "Continue to Payment →" : "Upload Squad to Continue"}
          </>
        )}
      </Button>
    </div>
  );
}
