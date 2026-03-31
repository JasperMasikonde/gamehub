import { cn } from "@/lib/utils/cn";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-subtle">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors resize-y min-h-[100px]",
            "focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent",
            error
              ? "border-neon-red focus:ring-neon-red"
              : "border-bg-border hover:border-text-muted",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-neon-red">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export { Textarea };
