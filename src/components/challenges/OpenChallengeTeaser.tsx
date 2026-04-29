import Link from "next/link";
import { Swords, ArrowRight, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatChallengeFormat } from "@/lib/utils/format";

interface Props {
  challenge: {
    id: string;
    wagerAmount: unknown;
    currency: string;
    format: string;
    description: string | null;
    expiresAt: Date;
    host: {
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  };
  totalOpen: number;
}

function timeLeft(expiresAt: Date): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expiring";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function initials(u: { username: string; displayName: string | null }) {
  const name = u.displayName ?? u.username;
  return name.slice(0, 2).toUpperCase();
}

export function OpenChallengeTeaser({ challenge, totalOpen }: Props) {
  const wager = Number(challenge.wagerAmount);
  const remaining = timeLeft(challenge.expiresAt);
  const hostName = challenge.host.displayName ?? challenge.host.username;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-neon-red/20 bg-gradient-to-br from-neon-red/8 via-bg-surface to-bg-elevated">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-neon-red/10 blur-3xl pointer-events-none" />

      <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Icon column */}
        <div className="w-14 h-14 rounded-2xl border border-neon-red/25 bg-neon-red/10 flex items-center justify-center shrink-0">
          <Swords size={26} className="text-neon-red" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Badge + timer */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-neon-red/30 bg-neon-red/10 text-neon-red">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-red animate-pulse" />
              Open Challenge
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-text-muted">
              <Clock size={9} />
              {remaining}
            </span>
          </div>

          {/* Wager + host */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-black text-neon-red tabular-nums">
              KES {wager.toLocaleString()}
            </span>
            <span className="text-xs text-text-muted font-medium">prize pot</span>
          </div>

          {/* Host + format */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
            {/* Avatar */}
            <span className="flex items-center gap-1.5">
              {challenge.host.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={challenge.host.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-neon-red/20 border border-neon-red/30 flex items-center justify-center text-[9px] font-bold text-neon-red">
                  {initials(challenge.host)}
                </span>
              )}
              <span className="font-medium text-text-primary">{hostName}</span>
            </span>
            <span className="text-bg-border">·</span>
            <span>{formatChallengeFormat(challenge.format)}</span>
            {challenge.description && (
              <>
                <span className="text-bg-border">·</span>
                <span className="truncate max-w-[180px]">{challenge.description}</span>
              </>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <Link
            href={`/challenges/${challenge.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neon-red text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,59,92,0.35)]"
          >
            Accept <ArrowRight size={14} />
          </Link>
          {totalOpen > 1 && (
            <Link
              href="/challenges"
              className="text-[11px] text-text-muted hover:text-neon-red transition-colors"
            >
              +{totalOpen - 1} more open {totalOpen - 1 === 1 ? "challenge" : "challenges"}
            </Link>
          )}
        </div>
      </div>

      {/* Escrow trust strip */}
      <div className="px-5 sm:px-6 pb-4">
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <Shield size={9} className="text-neon-green" />
          Wager held in escrow · Released to winner only
        </div>
      </div>
    </div>
  );
}
