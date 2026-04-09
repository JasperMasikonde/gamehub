"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 text-center">
      <p className="text-neon-red font-mono text-sm tracking-widest uppercase mb-4">
        Error
      </p>
      <h1 className="text-4xl font-bold text-text-primary mb-3">
        Something went wrong
      </h1>
      <p className="text-text-muted max-w-sm mb-8">
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-neon-green text-bg-primary font-semibold px-6 py-3 rounded-lg hover:bg-neon-green/90 transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 border border-bg-border text-text-primary font-semibold px-6 py-3 rounded-lg hover:border-neon-blue hover:text-neon-blue transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
