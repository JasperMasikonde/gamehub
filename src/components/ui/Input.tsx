import { cn } from "@/lib/utils/cn";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-text-subtle"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors",
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

Input.displayName = "Input";
export { Input };
