"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { deliverCredentialsSchema } from "@/lib/validations/transaction";
import type { z } from "zod";
import { Lock, Camera, X, Upload, Loader2 } from "lucide-react";

type Form = z.infer<typeof deliverCredentialsSchema>;

interface UploadedScreenshot {
  gcsKey: string;
  previewUrl: string;
}

export function SellerDeliveryForm({
  transactionId,
  listingId,
}: {
  transactionId: string;
  listingId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(deliverCredentialsSchema),
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || screenshots.length + files.length > 6) {
      setError("Maximum 6 screenshots allowed");
      return;
    }
    setUploading(true);
    setError("");

    for (const file of Array.from(files)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPEG, PNG and WebP images are allowed");
        continue;
      }
      try {
        // 1. Get signed upload URL
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Upload URL failed");
          continue;
        }
        const { uploadUrl, gcsKey } = await res.json();

        // 2. Upload directly to GCS
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) {
          setError("Upload to storage failed");
          continue;
        }

        // 3. Local preview URL (blob)
        const previewUrl = URL.createObjectURL(file);
        setScreenshots((prev) => [...prev, { gcsKey, previewUrl }]);
      } catch {
        setError("Screenshot upload failed. GCS may not be configured.");
      }
    }
    setUploading(false);
  };

  const removeScreenshot = (gcsKey: string) => {
    setScreenshots((prev) => prev.filter((s) => s.gcsKey !== gcsKey));
  };

  const onSubmit = async (data: Form) => {
    setError("");
    const res = await fetch(`/api/transactions/${transactionId}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        screenshotGcsKeys: screenshots.map((s) => s.gcsKey),
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to deliver credentials");
      return;
    }

    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-neon-green" />
          <h2 className="font-semibold text-sm">Deliver Account Credentials</h2>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          Credentials are encrypted end-to-end and only visible to the buyer
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Screenshots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Camera size={13} className="text-neon-purple" />
                Account Screenshots
                <span className="text-text-muted font-normal text-xs">(recommended — up to 6)</span>
              </label>
              {screenshots.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 text-xs text-neon-blue hover:text-neon-green transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  Add photos
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {screenshots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {screenshots.map((s) => (
                  <div key={s.gcsKey} className="relative group aspect-video rounded-lg overflow-hidden border border-bg-border">
                    <img src={s.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(s.gcsKey)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {screenshots.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-video rounded-lg border-2 border-dashed border-bg-border hover:border-neon-purple/40 flex items-center justify-center text-text-muted hover:text-neon-purple transition-colors"
                  >
                    <Upload size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 rounded-xl border-2 border-dashed border-bg-border hover:border-neon-purple/40 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-neon-purple transition-colors"
              >
                {uploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={20} />
                    <span className="text-xs">Upload screenshots showing the account state</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Credentials */}
          <div className="border-t border-bg-border pt-4 flex flex-col gap-3">
            <p className="text-xs text-text-muted flex items-center gap-1.5">
              <Lock size={11} className="text-neon-green" />
              Account login credentials — AES-256 encrypted before storage
            </p>
            <Input
              label="Account Email"
              type="email"
              placeholder="account@example.com"
              error={errors.accountEmail?.message}
              {...register("accountEmail")}
            />
            <Input
              label="Account Password"
              type="password"
              placeholder="Account password"
              error={errors.accountPassword?.message}
              {...register("accountPassword")}
            />
            <Input
              label="Account Username (optional)"
              placeholder="In-game username"
              {...register("accountUsername")}
            />
            <Textarea
              label="Notes for the buyer (optional)"
              placeholder="2FA code, recovery email, additional instructions…"
              {...register("notes")}
            />
          </div>

          <Button type="submit" loading={isSubmitting} className="mt-1">
            <Lock size={14} />
            Deliver Credentials
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
