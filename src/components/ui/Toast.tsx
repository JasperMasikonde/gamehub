"use client";

import Link from "next/link";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ToastPayload } from "@/types/socket";

const config: Record<
  string,
  { icon: React.ElementType; accent: string; glow: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle,
    accent: "border-l-neon-green",
    glow: "shadow-[0_8px_32px_rgba(0,255,135,0.18)]",
    iconColor: "text-neon-green",
  },
  error: {
    icon: AlertCircle,
    accent: "border-l-neon-red",
    glow: "shadow-[0_8px_32px_rgba(255,51,102,0.18)]",
    iconColor: "text-neon-red",
  },
  info: {
    icon: Info,
    accent: "border-l-neon-blue",
    glow: "shadow-[0_8px_32px_rgba(0,212,255,0.18)]",
    iconColor: "text-neon-blue",
  },
  warning: {
    icon: AlertTriangle,
    accent: "border-l-neon-yellow",
    glow: "shadow-[0_8px_32px_rgba(255,215,0,0.18)]",
    iconColor: "text-neon-yellow",
  },
  deal: {
    icon: Zap,
    accent: "border-l-neon-purple",
    glow: "shadow-[0_8px_32px_rgba(168,85,247,0.18)]",
    iconColor: "text-neon-purple",
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastPayload;
  onRemove: (id: string) => void;
}) {
  const { icon: Icon, accent, glow, iconColor } = config[toast.type] ?? config.info;

  return (
    <div
      className={cn(
        // Base surface
        "relative flex items-start gap-3 w-full rounded-xl overflow-hidden",
        "bg-bg-elevated border border-bg-border border-l-[3px]",
        // Neon left bar
        accent,
        // Glow
        glow,
        // Animation
        "animate-in slide-in-from-bottom-3 fade-in duration-300",
        // Padding
        "px-4 py-3.5"
      )}
    >
      {/* Icon */}
      <Icon size={17} className={cn(iconColor, "shrink-0 mt-0.5")} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{toast.message}</p>
        )}
        {toast.linkUrl && (
          <Link
            href={toast.linkUrl}
            className={cn("text-xs mt-1.5 inline-block font-medium hover:underline", iconColor)}
          >
            {toast.linkLabel ?? "View →"}
          </Link>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onRemove(toast.id)}
        className="text-text-muted hover:text-text-primary shrink-0 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastPayload[];
  onRemove: (id: string) => void;
}) {
  if (!toasts.length) return null;

  return (
    <div
      className={cn(
        "fixed z-[100] pointer-events-none",
        // Mobile: full-width strip at the bottom
        "bottom-0 left-0 right-0 px-3 pb-4 flex flex-col gap-2",
        // Desktop: anchored bottom-right, fixed width
        "sm:bottom-5 sm:right-5 sm:left-auto sm:w-[340px] sm:px-0 sm:pb-0"
      )}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
