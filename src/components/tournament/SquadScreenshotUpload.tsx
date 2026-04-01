"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME ?? "";
function imgUrl(key: string) {
  return `https://storage.googleapis.com/${BUCKET}/${key}`;
}

interface Props {
  slug: string;
  currentKey: string | null;
  currentTeamName: string | null;
}

export function SquadScreenshotUpload({ slug, currentKey, currentTeamName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [teamName, setTeamName] = useState(currentTeamName ?? "");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentKey ? imgUrl(currentKey) : null);
  const [submitted, setSubmitted] = useState(!!currentKey);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    if (!teamName.trim()) { setError("Please enter your team name first."); return; }
    setError(""); setUploading(true);
    try {
      const sigRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "squad-screenshots" }),
      });
      if (!sigRes.ok) { setError("Upload failed. Try again."); return; }
      const { uploadUrl, gcsKey } = await sigRes.json();

      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const saveRes = await fetch(`/api/tournaments/${slug}/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcsKey, teamName: teamName.trim() }),
      });
      if (!saveRes.ok) { setError("Failed to save. Try again."); return; }

      setPreview(imgUrl(gcsKey));
      setSubmitted(true);
    } catch { setError("Upload error. Check your connection."); }
    finally { setUploading(false); }
  }

  if (submitted && preview) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-neon-green text-sm font-medium">
          <CheckCircle size={15} />
          Squad verified
        </div>
        {currentTeamName && (
          <p className="text-xs text-text-muted">Team: <span className="text-text-primary font-medium">{currentTeamName}</span></p>
        )}
        <div className="relative group max-w-xs">
          <img src={preview} alt="Your squad" className="w-full rounded-xl border border-bg-border object-cover max-h-48" />
          <button
            onClick={() => { setSubmitted(false); setPreview(null); }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity text-xs text-white gap-1.5"
          >
            <Camera size={13} /> Update
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-xs text-yellow-400/90">
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <p>Take a clear screenshot showing your <span className="font-semibold">team name</span> and full squad. This is submitted once and used to verify your team for all your matches in this tournament.</p>
      </div>

      {/* Team name input */}
      <div>
        <label className="block text-xs text-text-muted mb-1">Your full team name</label>
        <input
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          placeholder="e.g. FC Barcelona Ultimate"
          className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/50 transition-colors"
        />
      </div>

      {/* Screenshot upload */}
      <button
        onClick={() => { if (!teamName.trim()) { setError("Please enter your team name first."); return; } inputRef.current?.click(); }}
        disabled={uploading}
        className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 disabled:opacity-50 transition-colors"
      >
        {uploading ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Camera size={13} /> Upload squad screenshot</>}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {error && <p className="text-xs text-neon-red">{error}</p>}
    </div>
  );
}
