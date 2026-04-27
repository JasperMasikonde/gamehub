import Link from "next/link";
import { Trophy, Users, Calendar, ArrowRight, Zap, Clock } from "lucide-react";
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
    name: string;
    game: string;
    prizePool: number;
    participantCount: number;
    startDate?: Date | null;
  } | null;
}

const ACCENT: Record<string, {
  gradient: string; border: string; badge: string;
  cta: string; glow: string; text: string; icon: string;
}> = {
  GREEN: {
    gradient: "from-neon-green/15 via-neon-green/5 to-transparent",
    border: "border-neon-green/25", badge: "bg-neon-green/15 border-neon-green/30 text-neon-green",
    cta: "bg-neon-green text-bg-primary hover:opacity-90 shadow-[0_0_24px_rgba(0,255,135,0.4)]",
    glow: "bg-neon-green/15", text: "text-neon-green", icon: "text-neon-green",
  },
  BLUE: {
    gradient: "from-neon-blue/15 via-neon-blue/5 to-transparent",
    border: "border-neon-blue/25", badge: "bg-neon-blue/15 border-neon-blue/30 text-neon-blue",
    cta: "bg-neon-blue text-bg-primary hover:opacity-90 shadow-[0_0_24px_rgba(0,212,255,0.4)]",
    glow: "bg-neon-blue/15", text: "text-neon-blue", icon: "text-neon-blue",
  },
  PURPLE: {
    gradient: "from-purple-500/15 via-purple-500/5 to-transparent",
    border: "border-purple-500/25", badge: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    cta: "bg-purple-500 text-white hover:opacity-90 shadow-[0_0_24px_rgba(168,85,247,0.4)]",
    glow: "bg-purple-500/15", text: "text-purple-400", icon: "text-purple-400",
  },
  YELLOW: {
    gradient: "from-yellow-500/15 via-yellow-500/5 to-transparent",
    border: "border-yellow-500/25", badge: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400",
    cta: "bg-yellow-500 text-bg-primary hover:opacity-90 shadow-[0_0_24px_rgba(245,158,11,0.4)]",
    glow: "bg-yellow-500/15", text: "text-yellow-400", icon: "text-yellow-400",
  },
  RED: {
    gradient: "from-neon-red/15 via-neon-red/5 to-transparent",
    border: "border-neon-red/25", badge: "bg-neon-red/15 border-neon-red/30 text-neon-red",
    cta: "bg-neon-red text-white hover:opacity-90 shadow-[0_0_24px_rgba(255,59,92,0.4)]",
    glow: "bg-neon-red/15", text: "text-neon-red", icon: "text-neon-red",
  },
};

export function HeroBanner({ title, subtitle, badgeText, ctaLabel, ctaUrl, accentColor, countdownTo, tournament }: Props) {
  const a = ACCENT[accentColor] ?? ACCENT.GREEN;

  return (
    <div className={cn("relative rounded-3xl overflow-hidden border bg-gradient-to-br from-bg-surface to-bg-elevated p-7 sm:p-10", a.border)}>
      {/* Gradient overlays */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", a.gradient)} />
      <div className={cn("absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none", a.glow)} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Badge */}
          {badgeText && (
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", a.text.replace("text-", "bg-"))} />
              <span className={cn("text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border", a.badge)}>
                {badgeText}
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary leading-tight">{title}</h2>
            {subtitle && <p className="text-text-muted mt-2 text-sm sm:text-base leading-relaxed max-w-xl">{subtitle}</p>}
          </div>

          {/* Tournament meta pills */}
          {tournament && (
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted bg-bg-elevated border border-bg-border px-3 py-1.5 rounded-full">
                <Zap size={11} className={a.icon} />{tournament.game}
              </span>
              {Number(tournament.prizePool) > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted bg-bg-elevated border border-bg-border px-3 py-1.5 rounded-full">
                  <Trophy size={11} className={a.icon} />KES {Number(tournament.prizePool).toLocaleString()} prize pool
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted bg-bg-elevated border border-bg-border px-3 py-1.5 rounded-full">
                <Users size={11} className={a.icon} />{tournament.participantCount} registered
              </span>
              {tournament.startDate && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted bg-bg-elevated border border-bg-border px-3 py-1.5 rounded-full">
                  <Calendar size={11} className={a.icon} />
                  {new Date(tournament.startDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
          )}

          {/* CTA row */}
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href={ctaUrl}
              className={cn("flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95", a.cta)}
            >
              {ctaLabel}
              <ArrowRight size={15} />
            </Link>

            {/* Countdown */}
            {countdownTo && (
              <div className="flex items-center gap-2">
                <Clock size={13} className={cn("shrink-0", a.text)} />
                <span className={cn("text-xs font-semibold uppercase tracking-wide mr-1", a.text)}>Starts in</span>
                <CountdownTimer target={countdownTo} />
              </div>
            )}
          </div>
        </div>

        {/* Decorative icon */}
        <div className={cn("hidden sm:flex w-28 h-28 rounded-3xl border items-center justify-center shrink-0", a.badge)}>
          <Trophy size={48} className={a.text} />
        </div>
      </div>
    </div>
  );
}
