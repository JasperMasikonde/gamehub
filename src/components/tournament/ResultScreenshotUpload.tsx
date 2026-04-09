"use client";
import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { compressImage } from "@/lib/utils/compress-image";

const BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME ?? "";
function imgUrl(key: string) {
  return `https://storage.googleapis.com/${BUCKET}/${key}`;
}

interface Props {
  slug: string;
  matchId: string;
  currentKey: string | null;
}

export function ResultScreenshotUpload({ slug, matchId, currentKey }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentKey ? imgUrl(currentKey) : null);
  const [error, setError] = useState("");

  async function handleFile(raw: File) {
    setError(""); setUploading(true);
    try {
      const file = await compressImage(raw);
      const sigRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "match-results" }),
      });
      if (!sigRes.ok) { setError("Upload failed. Try again."); return; }
      const { uploadUrl, gcsKey } = await sigRes.json();

      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const saveRes = await fetch(`/api/tournaments/${slug}/matches/${matchId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcsKey }),
      });
      if (!saveRes.ok) { setError("Failed to save. Try again."); return; }

      setPreview(imgUrl(gcsKey));
    } catch { setError("Upload error. Check your connection."); }
    finally { setUploading(false); }
  }

  if (preview) {
    return (
      <div className="space-y-2">
        <div className="relative group max-w-xs">
          <img src={preview} alt="Match result" className="w-full rounded-xl border border-neon-green/30 object-cover max-h-48" />
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity text-xs text-white gap-1.5"
          >
            <RefreshCw size={12} /> Replace
          </button>
          <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-neon-green/20 text-neon-green text-[10px] px-1.5 py-0.5 rounded-full border border-neon-green/30">
            <CheckCircle size={9} /> Submitted
          </span>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {error && <p className="text-xs text-neon-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-sm font-medium hover:bg-neon-blue/20 disabled:opacity-50 transition-colors"
      >
        {uploading
          ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
          : <><Upload size={13} /> Upload result screenshot</>
        }
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}
