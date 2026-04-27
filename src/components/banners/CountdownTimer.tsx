"use client";
import { useEffect, useState } from "react";

function pad(n: number) { return String(n).padStart(2, "0"); }

export function CountdownTimer({ target }: { target: string }) {
  const [parts, setParts] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, new Date(target).getTime() - Date.now());
      const s = Math.floor(diff / 1000);
      setParts({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!parts) return null;
  if (parts.d === 0 && parts.h === 0 && parts.m === 0 && parts.s === 0) {
    return <span className="text-xs font-bold text-neon-green">Starting now!</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {parts.d > 0 && <Unit n={parts.d} label="d" />}
      <Unit n={parts.h} label="h" />
      <Unit n={parts.m} label="m" />
      <Unit n={parts.s} label="s" />
    </div>
  );
}

function Unit({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-black tabular-nums leading-none">{pad(n)}</span>
      <span className="text-[9px] text-text-muted uppercase tracking-wide">{label}</span>
    </div>
  );
}
