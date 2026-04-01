import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-neon-green" />
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    </div>
  );
}
