"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleResend = async () => {
    setResendState("sending");
    setErrorMsg("");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setResendState("sent");
    } else {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setErrorMsg(json.error ?? "Failed to resend. Please try again.");
      setResendState("error");
    }
  };

  return (
    <div className="flex flex-col gap-5 text-center">
      <div className="flex justify-center">
        <div className="w-14 h-14 bg-neon-blue/10 rounded-full flex items-center justify-center">
          <Mail size={24} className="text-neon-blue" />
        </div>
      </div>

      <div>
        <p className="text-sm text-text-muted">
          We sent a verification link to{" "}
          {email ? (
            <span className="text-text-primary font-medium">{email}</span>
          ) : (
            "your email address"
          )}
          .
        </p>
        <p className="text-sm text-text-muted mt-1">
          Click the link to activate your account and sign in.
        </p>
      </div>

      {resendState === "sent" ? (
        <div className="flex items-center gap-2 justify-center text-sm text-neon-green">
          <CheckCircle size={14} />
          Verification email resent!
        </div>
      ) : (
        <div className="flex flex-col gap-2 items-center">
          <p className="text-xs text-text-muted">Didn&apos;t receive the email?</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleResend()}
            disabled={resendState === "sending"}
            loading={resendState === "sending"}
          >
            Resend verification email
          </Button>
          {resendState === "error" && (
            <p className="text-xs text-neon-red">{errorMsg}</p>
          )}
        </div>
      )}

      <Link
        href="/login"
        className="text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        Already verified? Sign in
      </Link>
    </div>
  );
}
