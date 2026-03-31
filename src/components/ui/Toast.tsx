"use client";

import Link from "next/link";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ToastPayload } from "@/types/socket";

const config: Record<
  string,
  { icon: React.ElementType; color: string; border: string; bg: string }
> = {
  success: {
    icon: CheckCircle,
    color: "text-neon-green",
    border: "border-neon-green/30",
    bg: "bg-neon-green/5",
  },
  error: {
    icon: AlertCircle,
    color: "text-neon-red",
    border: "border-neon-red/30",
    bg: "bg-neon-red/5",
  },
  info: {
    icon: Info,
    color: "text-neon-blue",
    border: "border-neon-blue/30",
    bg: "bg-neon-blue/5",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-neon-yellow",
    border: "border-neon-yellow/30",
    bg: "bg-neon-yellow/5",
  },
  deal: {
    icon: Zap,
    color: "text-neon-purple",
    border: "border-neon-purple/30",
    bg: "bg-neon-purple/5",
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastPayload;
  onRemove: (id: string) => void;
}) {
  const { icon: Icon, color, border, bg } = config[toast.type] ?? config.info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-80 p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300",
        bg,
        border
      )}
    >
      <Icon size={18} className={cn(color, "shrink-0 mt-0.5")} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            {toast.message}
          </p>
        )}
        {toast.linkUrl && (
          <Link
            href={toast.linkUrl}
            className={cn("text-xs mt-1.5 inline-block font-medium hover:underline", color)}
          >
            {toast.linkLabel ?? "View →"}
          </Link>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-text-muted hover:text-text-primary shrink-0 transition-colors"
      >
        <X size={14} />
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
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
