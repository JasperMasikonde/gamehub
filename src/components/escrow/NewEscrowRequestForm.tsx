"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Banknote, FileText, ArrowRight, Camera, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

const SCREENSHOT_LABELS = ["Username", "Current Squad", "Reserve Players", "Managers", "Coins (optional)"];

interface UploadedShot {
  url: string;
  previewUrl: string;
}

export function NewEscrowRequestForm() {
  const router = useRouter();
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [form, setForm] = useState({
    counterpartyUsername: "",
    title: "",
    description: "",
    price: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<(UploadedShot | null)[]>([null, null, null, null, null]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const triggerUpload = (slot: number) => {
    pendingSlotRef.current = slot;
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
    const slot = pendingSlotRef.current;
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
      setUploads((prev) => {
        const next = [...prev];
        next[slot] = { url: publicUrl, previewUrl: URL.createObjectURL(file) };
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — check server logs");
    }
    setUploading(false);
  };

  const removeUpload = (slot: number) => {
    setUploads((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  };

  const requiredUploaded = uploads.slice(0, 4).every((u) => u !== null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (role === "SELLER" && !requiredUploaded) {
      setError("Please upload all 4 required screenshots (username, squad, reserves, managers) before submitting.");
      return;
    }

    setLoading(true);
    try {
      const sellerScreenshots = role === "SELLER"
        ? uploads.filter((u) => u !== null).map((u) => u!.url)
        : undefined;

      const res = await fetch("/api/escrow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counterpartyUsername: form.counterpartyUsername,
          initiatorRole: role,
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          ...(sellerScreenshots ? { sellerScreenshots } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      router.push(`/escrow-requests/${data.escrowRequest.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* Role selection */}
      <div>
        <label className="block text-sm font-medium mb-3">I am the…</label>
        <div className="grid grid-cols-2 gap-3">
          {(["BUYER", "SELLER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                role === r
                  ? r === "BUYER"
                    ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
                    : "border-neon-green bg-neon-green/10 text-neon-green"
                  : "border-bg-border text-text-muted hover:border-bg-border/80 hover:text-text-primary"
              )}
            >
              {r === "BUYER" ? "🛒 Buyer" : "🏷️ Seller"}
              <p className="text-[11px] font-normal mt-0.5 opacity-70">
                {r === "BUYER" ? "I will pay for the account" : "I will transfer the account"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Seller screenshots — required when role is SELLER */}
      {role === "SELLER" && (
        <div className="border border-neon-yellow/30 bg-neon-yellow/5 rounded-xl p-5">
          <p className="text-sm font-semibold text-neon-yellow mb-1 flex items-center gap-2">
            <Camera size={14} />
            Account Verification Screenshots
          </p>
          <p className="text-xs text-text-muted mb-4">
            Upload proof of your account. Required: username, current squad, reserve players, managers. Coins screenshot optional.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />

          <div className="grid grid-cols-5 gap-2">
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
                      onClick={() => triggerUpload(i)}
                      disabled={uploading}
                      className={cn(
                        "aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors",
                        isRequired
                          ? "border-neon-yellow/40 hover:border-neon-yellow text-neon-yellow/60 hover:text-neon-yellow"
                          : "border-bg-border hover:border-neon-purple/40 text-text-muted hover:text-neon-purple"
                      )}
                    >
                      {uploading && pendingSlotRef.current === i ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Upload size={12} />
                      )}
                    </button>
                  )}
                  <span className="text-[10px] text-center text-text-muted leading-tight">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {requiredUploaded && (
            <p className="text-xs text-neon-green mt-3">✓ All required screenshots uploaded</p>
          )}
        </div>
      )}

      {/* Counterparty */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <User size={13} className="inline mr-1" />
          Other party&apos;s username
        </label>
        <Input
          value={form.counterpartyUsername}
          onChange={(e) => set("counterpartyUsername", e.target.value)}
          placeholder="e.g. john_doe"
          required
        />
        <p className="text-xs text-text-muted mt-1">
          They will receive a notification to accept or decline.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <FileText size={13} className="inline mr-1" />
          Deal title
        </label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. PS5 eFootball account — 2800 OVR"
          required
          maxLength={120}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Description</label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the account — platform, division, coins, featured players, etc."
          rows={4}
          required
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Banknote size={13} className="inline mr-1" />
          Agreed price (KSh)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium pointer-events-none">
            KSh
          </span>
          <Input
            type="number"
            min="1"
            step="1"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="0"
            required
            className="pl-12"
          />
        </div>
      </div>

      {/* Escrow info callout */}
      <div className="flex gap-3 p-4 rounded-xl bg-neon-green/5 border border-neon-green/20">
        <ShieldCheck size={18} className="text-neon-green shrink-0 mt-0.5" />
        <div className="text-xs text-text-muted leading-relaxed">
          <span className="text-neon-green font-semibold">How this works: </span>
          Once both parties accept, the buyer pays into escrow. The seller delivers
          the account credentials through Eshabiki. The buyer confirms, and funds are released.
          If there&apos;s a dispute, our admins will resolve it.
        </div>
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/5 border border-neon-red/20 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" className="w-full" disabled={loading || (role === "SELLER" && !requiredUploaded)}>
        {loading ? "Sending request…" : (
          <>Send Escrow Request <ArrowRight size={15} /></>
        )}
      </Button>
    </form>
  );
}
