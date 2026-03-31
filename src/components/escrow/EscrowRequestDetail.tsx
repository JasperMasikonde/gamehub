"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, User, ArrowLeft, CheckCircle, XCircle, Clock, Ban, Camera, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Party {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface EscrowRequest {
  id: string;
  initiatorId: string;
  counterpartyId: string;
  initiatorRole: "BUYER" | "SELLER";
  title: string;
  description: string;
  price: { toString(): string } | string | number;
  currency: string;
  status: string;
  transactionId: string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  sellerScreenshots: string[];
  initiator: Party;
  counterparty: Party;
}

const STATUS_UI: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-neon-yellow", label: "Awaiting response" },
  ACCEPTED: { icon: CheckCircle, color: "text-neon-green", label: "Accepted" },
  REJECTED: { icon: XCircle, color: "text-neon-red", label: "Declined" },
  CANCELLED: { icon: Ban, color: "text-text-muted", label: "Cancelled" },
  EXPIRED: { icon: Clock, color: "text-text-muted", label: "Expired" },
};

const SCREENSHOT_LABELS = ["Username", "Current Squad", "Reserve Players", "Managers", "Coins"];

interface UploadedShot {
  url: string;
  previewUrl: string;
  label: string;
}

export function EscrowRequestDetail({
  escrowRequest,
  myId,
}: {
  escrowRequest: EscrowRequest;
  myId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | "cancel" | null>(null);
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState<UploadedShot[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingLabelRef = useRef<string>("");

  const isInitiator = escrowRequest.initiatorId === myId;
  const isCounterparty = escrowRequest.counterpartyId === myId;

  const myRole = isInitiator
    ? escrowRequest.initiatorRole
    : escrowRequest.initiatorRole === "BUYER"
    ? "SELLER"
    : "BUYER";

  const iAmSeller = myRole === "SELLER";

  const buyer = escrowRequest.initiatorRole === "BUYER" ? escrowRequest.initiator : escrowRequest.counterparty;
  const seller = escrowRequest.initiatorRole === "SELLER" ? escrowRequest.initiator : escrowRequest.counterparty;

  const statusUi = STATUS_UI[escrowRequest.status] ?? STATUS_UI.PENDING;
  const StatusIcon = statusUi.icon;

  // Which screenshot slots still need to be uploaded (first 4 required, 5th optional)
  const existingCount = escrowRequest.sellerScreenshots?.length ?? 0;
  const uploadedCount = existingCount + uploads.length;
  const canAccept = !iAmSeller || uploadedCount >= 4;

  const triggerUpload = (label: string) => {
    pendingLabelRef.current = label;
    fileInputRef.current?.click();
  };

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
      setUploads((prev) => [
        ...prev,
        { url: publicUrl, previewUrl: URL.createObjectURL(file), label: pendingLabelRef.current },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — check server logs");
    }
    setUploading(false);
  };

  const removeUpload = (idx: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  const act = async (action: "accept" | "reject" | "cancel") => {
    setLoading(action);
    setError("");
    try {
      const body = action === "accept" && iAmSeller && uploads.length > 0
        ? JSON.stringify({ sellerScreenshots: uploads.map((u) => u.url) })
        : "{}";
      const res = await fetch(`/api/escrow-requests/${escrowRequest.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }

      if (action === "accept" && data.transaction) {
        router.push(`/dashboard/escrow/${data.transaction.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <Link href="/dashboard/escrow-requests" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to requests
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">{escrowRequest.title}</h1>
          <div className={cn("flex items-center gap-1.5 text-sm mt-1", statusUi.color)}>
            <StatusIcon size={14} />
            {statusUi.label}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-neon-green">
            {formatCurrency(escrowRequest.price.toString())}
          </p>
          <p className="text-xs text-text-muted">{escrowRequest.currency}</p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-bg-elevated border border-bg-border rounded-xl p-5 mb-5">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Deal Description</h3>
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{escrowRequest.description}</p>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: "Buyer", party: buyer, isMy: buyer.id === myId },
          { label: "Seller", party: seller, isMy: seller.id === myId },
        ].map(({ label, party, isMy }) => (
          <div key={label} className={cn("rounded-xl border p-4", isMy ? "border-neon-blue/30 bg-neon-blue/5" : "border-bg-border bg-bg-elevated")}>
            <p className="text-xs text-text-muted mb-2">{label} {isMy && <span className="text-neon-blue">(you)</span>}</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-bg-surface border border-bg-border flex items-center justify-center overflow-hidden shrink-0">
                {party.avatarUrl ? (
                  <img src={party.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-text-muted" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{party.displayName ?? party.username}</p>
                <p className="text-xs text-text-muted">@{party.username}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Seller screenshots (already uploaded — visible to both parties) */}
      {escrowRequest.sellerScreenshots && escrowRequest.sellerScreenshots.length > 0 && (
        <div className="bg-bg-elevated border border-bg-border rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            <Camera size={11} className="inline mr-1" />
            Seller Account Verification Screenshots
          </p>
          <div className="grid grid-cols-3 gap-2">
            {escrowRequest.sellerScreenshots.map((url, i) => (
              <div key={i} className="relative">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={SCREENSHOT_LABELS[i] ?? `Screenshot ${i + 1}`} className="w-full aspect-video object-cover rounded-lg border border-bg-border hover:border-neon-blue/40 transition-colors" />
                </a>
                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {SCREENSHOT_LABELS[i] ?? `#${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escrow info */}
      <div className="flex gap-3 p-4 rounded-xl bg-neon-green/5 border border-neon-green/20 mb-6">
        <ShieldCheck size={16} className="text-neon-green shrink-0 mt-0.5" />
        <p className="text-xs text-text-muted leading-relaxed">
          Your role: <span className={myRole === "BUYER" ? "text-neon-blue font-semibold" : "text-neon-green font-semibold"}>{myRole}</span>
          {myRole === "BUYER"
            ? " — You will pay into escrow. Funds are held until you confirm the account."
            : " — You will deliver the account credentials after the buyer pays."}
        </p>
      </div>

      {/* Meta */}
      <div className="text-xs text-text-muted mb-6 flex gap-4">
        <span>Created {formatDate(escrowRequest.createdAt.toString())}</span>
        {escrowRequest.expiresAt && (
          <span>Expires {formatDate(escrowRequest.expiresAt.toString())}</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/5 border border-neon-red/20 rounded-lg px-4 py-2.5 mb-4">
          {error}
        </p>
      )}

      {/* Seller screenshot upload — shown when counterparty is seller and status is PENDING */}
      {isCounterparty && iAmSeller && escrowRequest.status === "PENDING" && existingCount < 4 && (
        <div className="border border-neon-yellow/30 bg-neon-yellow/5 rounded-xl p-5 mb-5">
          <p className="text-sm font-semibold text-neon-yellow mb-1 flex items-center gap-2">
            <Camera size={14} />
            Account Verification Required
          </p>
          <p className="text-xs text-text-muted mb-4">
            Upload screenshots of your account before accepting. Required: username, current squad, reserve players, managers. Coins optional.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />

          <div className="grid grid-cols-5 gap-2 mb-3">
            {SCREENSHOT_LABELS.map((label, i) => {
              const isRequired = i < 4;
              const upload = uploads[i];
              return (
                <div key={label} className="flex flex-col gap-1">
                  {upload ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-neon-green/40 group">
                      <img src={upload.previewUrl} alt={label} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeUpload(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerUpload(label)}
                      disabled={uploading}
                      className={cn(
                        "aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors",
                        isRequired
                          ? "border-neon-yellow/40 hover:border-neon-yellow text-neon-yellow/60 hover:text-neon-yellow"
                          : "border-bg-border hover:border-neon-purple/40 text-text-muted hover:text-neon-purple"
                      )}
                    >
                      {uploading && pendingLabelRef.current === label ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Upload size={12} />
                      )}
                    </button>
                  )}
                  <span className="text-[10px] text-center text-text-muted leading-tight">
                    {label}{isRequired ? " *" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-text-muted">
            {uploads.length}/4 required uploaded
            {uploads.length >= 4 && <span className="text-neon-green ml-2">✓ Ready to accept</span>}
          </p>
        </div>
      )}

      {/* Actions */}
      {escrowRequest.status === "PENDING" && (
        <div className="flex gap-3">
          {isCounterparty && (
            <>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => act("accept")}
                disabled={loading !== null || !canAccept}
              >
                <CheckCircle size={15} />
                {loading === "accept" ? "Accepting…" : canAccept ? "Accept & Start Escrow" : "Upload screenshots first"}
              </Button>
              <Button
                variant="outline"
                className="border-neon-red/30 text-neon-red hover:bg-neon-red/10"
                onClick={() => act("reject")}
                disabled={loading !== null}
              >
                <XCircle size={15} />
                {loading === "reject" ? "Declining…" : "Decline"}
              </Button>
            </>
          )}
          {isInitiator && (
            <Button
              variant="outline"
              className="border-bg-border text-text-muted hover:text-neon-red"
              onClick={() => act("cancel")}
              disabled={loading !== null}
            >
              {loading === "cancel" ? "Cancelling…" : "Cancel Request"}
            </Button>
          )}
        </div>
      )}

      {escrowRequest.status === "ACCEPTED" && escrowRequest.transactionId && (
        <Link href={`/dashboard/escrow/${escrowRequest.transactionId}`}>
          <Button variant="primary" className="w-full">
            <ShieldCheck size={15} />
            View Escrow Transaction
          </Button>
        </Link>
      )}
    </div>
  );
}
