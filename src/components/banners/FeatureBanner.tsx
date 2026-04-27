import Link from "next/link";
import { Trophy, Users, ArrowRight, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CountdownTimer } from "./CountdownTimer";

interface Props {
  title: string;
  subtitle?: string | null;
  badgeText?: string | null;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: string;
  countdownTo?: string | null;
  tournament?: {
    game: string;
    prizePool: number;
    participantCount: number;
  } | null;
}

const ACCENT: Record<string, { border: string; badge: string; cta: string; bg: string; text: string; icon: string }> = {
  GREEN:  { border: "border-neon-green/25",  badge: "bg-neon-green/10 border-neon-green/20 text-neon-green",   cta: "bg-neon-green/15 border-neon-green/30 text-neon-green hover:bg-neon-green/25",    bg: "bg-neon-green/5",  text: "text-neon-green",  icon: "text-neon-green" },
  BLUE:   { border: "border-neon-blue/25",   badge: "bg-neon-blue/10 border-neon-blue/20 text-neon-blue",      cta: "bg-neon-blue/15 border-neon-blue/30 text-neon-blue hover:bg-neon-blue/25",         bg: "bg-neon-blue/5",   text: "text-neon-blue",   icon: "text-neon-blue" },
  PURPLE: { border: "border-purple-500/25",  badge: "bg-purple-500/10 border-purple-500/20 text-purple-400",   cta: "bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25",     bg: "bg-purple-500/5",  text: "text-purple-400",  icon: "text-purple-400" },
  YELLOW: { border: "border-yellow-500/25",  badge: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",   cta: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25",     bg: "bg-yellow-500/5",  text: "text-yellow-400",  icon: "text-yellow-400" },
  RED:    { border: "border-neon-red/25",    badge: "bg-neon-red/10 border-neon-red/20 text-neon-red",         cta: "bg-neon-red/15 border-neon-red/30 text-neon-red hover:bg-neon-red/25",             bg: "bg-neon-red/5",    text: "text-neon-red",    icon: "text-neon-red" },
};

export function FeatureBanner({ title, subtitle, badgeText, ctaLabel, ctaUrl, accentColor, countdownTo, tournament }: Props) {
  const a = ACCENT[accentColor] ?? ACCENT.GREEN;

  return (
    <div className={cn("rounded-2xl border overflow-hidden", a.border, a.bg)}>
      <div className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            {badgeText && (
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border", a.badge)}>
                <span className={cn("w-1 h-1 rounded-full animate-pulse", a.icon.replace("text-", "bg-"))} />
                {badgeText}
              </span>
            )}
            <h3 className="font-bold text-base text-text-primary leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-text-muted leading-relaxed">{subtitle}</p>}
          </div>
          <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0", a.badge)}>
            <Trophy size={22} className={a.text} />
          </div>
        </div>

        {/* Meta */}
        {tournament && (
          <div className="flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-medium text-text-muted bg-bg-elevated border border-bg-border px-2.5 py-1 rounded-full">
              <Zap size={9} className={a.icon} />{tournament.game}
            </span>
            {Number(tournament.prizePool) > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-text-muted bg-bg-elevated border border-bg-border px-2.5 py-1 rounded-full">
                <Trophy size={9} className={a.icon} />KES {Number(tournament.prizePool).toLocaleString()}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-medium text-text-muted bg-bg-elevated border border-bg-border px-2.5 py-1 rounded-full">
              <Users size={9} className={a.icon} />{tournament.participantCount} joined
            </span>
          </div>
        )}

        {/* Countdown */}
        {countdownTo && (
          <div className="flex items-center gap-2">
            <Clock size={11} className={cn("shrink-0", a.text)} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", a.text)}>Starts in</span>
            <CountdownTimer target={countdownTo} />
          </div>
        )}

        {/* CTA */}
        <Link
          href={ctaUrl}
          className={cn("flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-sm font-bold transition-colors", a.cta)}
        >
          {ctaLabel} <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
