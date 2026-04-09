"use client";

import { useState, useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { compressImage } from "@/lib/utils/compress-image";

interface UploadedImage {
  gcsKey: string;
  previewUrl: string;
  file: File;
}

interface ImageUploaderProps {
  onChange: (gcsKeys: string[]) => void;
  maxImages?: number;
}

export function ImageUploader({ onChange, maxImages = 8 }: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const remaining = maxImages - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    setError("");

    const uploaded: UploadedImage[] = [];
    for (const raw of toUpload) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(raw.type)) {
        setError("Only JPEG, PNG, and WebP images are allowed");
        continue;
      }
      if (raw.size > 10 * 1024 * 1024) {
        setError("Each image must be under 10 MB");
        continue;
      }

      const file = await compressImage(raw);

      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!res.ok) {
        setError("Failed to get upload URL");
        continue;
      }

      const { uploadUrl, gcsKey } = await res.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      uploaded.push({
        gcsKey,
        previewUrl: URL.createObjectURL(file),
        file,
      });
    }

    const next = [...images, ...uploaded];
    setImages(next);
    onChange(next.map((i) => i.gcsKey));
    setUploading(false);
  };

  const remove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    onChange(next.map((i) => i.gcsKey));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-text-subtle">
        Screenshots <span className="text-text-muted">({images.length}/{maxImages})</span>
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div
            key={img.gcsKey}
            className="relative aspect-video rounded-lg overflow-hidden border border-bg-border group"
          >
            <img
              src={img.previewUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            {i === 0 && (
              <span className="absolute top-1 left-1 text-[10px] bg-neon-green text-bg-primary px-1 rounded font-medium">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={11} className="text-white" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-video rounded-lg border-2 border-dashed border-bg-border flex flex-col items-center justify-center gap-1 transition-colors text-text-muted",
              "hover:border-neon-blue hover:text-neon-blue",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <div className="animate-spin w-5 h-5 border-2 border-neon-blue border-t-transparent rounded-full" />
            ) : (
              <>
                <Upload size={18} />
                <span className="text-xs">Add image</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-neon-red">{error}</p>}
      {images.length === 0 && (
        <p className="text-xs text-text-muted">At least 1 image required. First image is the cover.</p>
      )}
    </div>
  );
}
