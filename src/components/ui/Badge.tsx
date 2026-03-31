import { cn } from "@/lib/utils/cn";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-bg-elevated text-text-subtle border-bg-border",
  success: "bg-neon-green/10 text-neon-green border-neon-green/30",
  warning: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30",
  danger: "bg-neon-red/10 text-neon-red border-neon-red/30",
  info: "bg-neon-blue/10 text-neon-blue border-neon-blue/30",
  purple: "bg-neon-purple/10 text-neon-purple border-neon-purple/30",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
