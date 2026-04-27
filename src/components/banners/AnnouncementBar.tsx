"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  id: string;
  title: string;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: string;
  badgeText?: string | null;
}

const COLORS: Record<string, { bar: string; text: string; cta: string; dot: string }> = {
  GREEN:  { bar: "from-neon-green/10 to-transparent border-neon-green/20",  text: "text-neon-green",  cta: "bg-neon-green/15 border-neon-green/30 hover:bg-neon-green/25 text-neon-green",   dot: "bg-neon-green" },
  BLUE:   { bar: "from-neon-blue/10 to-transparent border-neon-blue/20",   text: "text-neon-blue",   cta: "bg-neon-blue/15 border-neon-blue/30 hover:bg-neon-blue/25 text-neon-blue",      dot: "bg-neon-blue" },
  PURPLE: { bar: "from-purple-500/10 to-transparent border-purple-500/20", text: "text-purple-400",  cta: "bg-purple-500/15 border-purple-500/30 hover:bg-purple-500/25 text-purple-400",  dot: "bg-purple-400" },
  YELLOW: { bar: "from-yellow-500/10 to-transparent border-yellow-500/20", text: "text-yellow-400",  cta: "bg-yellow-500/15 border-yellow-500/30 hover:bg-yellow-500/25 text-yellow-400",  dot: "bg-yellow-400" },
  RED:    { bar: "from-neon-red/10 to-transparent border-neon-red/20",     text: "text-neon-red",    cta: "bg-neon-red/15 border-neon-red/30 hover:bg-neon-red/25 text-neon-red",           dot: "bg-neon-red" },
};

export function AnnouncementBar({ id, title, ctaLabel, ctaUrl, accentColor, badgeText }: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const key = `banner-dismissed-${id}`;
    if (!localStorage.getItem(key)) setDismissed(false);
  }, [id]);

  if (dismissed) return null;

  const c = COLORS[accentColor] ?? COLORS.GREEN;

  function dismiss() {
    localStorage.setItem(`banner-dismissed-${id}`, "1");
    setDismissed(true);
  }

  return (
    <div className={cn("bg-gradient-to-r border-b px-4 py-2.5", c.bar)}>
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", c.dot)} />
        <Megaphone size={13} className={cn("shrink-0", c.text)} />

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {badgeText && (
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0", c.cta)}>
              {badgeText}
            </span>
          )}
          <p className="text-sm font-medium text-text-primary truncate">{title}</p>
        </div>

        <Link
          href={ctaUrl}
          className={cn("shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors", c.cta)}
        >
          {ctaLabel}
        </Link>

        <button
          onClick={dismiss}
          className="shrink-0 w-6 h-6 rounded-lg text-text-muted hover:text-text-primary flex items-center justify-center hover:bg-bg-elevated transition-colors"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
