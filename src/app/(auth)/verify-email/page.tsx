import { Suspense } from "react";
import { VerifyEmailContent } from "@/components/auth/VerifyEmailContent";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-6">
            <img src="/logo.svg" alt="Eshabiki" className="h-10 w-auto" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
            Check your email
          </h1>
          <p className="text-sm text-text-muted mt-1">
            One last step before you can play
          </p>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
          <Suspense fallback={<div className="h-40" />}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
