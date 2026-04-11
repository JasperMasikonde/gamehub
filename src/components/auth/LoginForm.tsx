"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginSchema, type LoginInput } from "@/lib/validations/user";
import { CheckCircle, Eye, EyeOff, Mail } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const justVerified = searchParams.get("verified") === "1";
  const isBanned = searchParams.get("banned") === "1";
  const next = searchParams.get("next");
  const redirectTo = next?.startsWith("/") ? next : "/dashboard";

  const urlError = searchParams.get("error");
  const [serverError, setServerError] = useState(
    urlError ? "Invalid email or password" : ""
  );
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError("");
    setNeedsVerification(false);
    setResendState("idle");

    const result = await loginAction(data.email, data.password);

    if (result.needsVerification) {
      setNeedsVerification(true);
      setVerificationEmail(data.email);
      return;
    }

    if (result.error) {
      setServerError(result.error);
      return;
    }

    window.location.href = redirectTo;
  };

  const handleResend = async () => {
    setResendState("sending");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verificationEmail }),
    });
    if (res.ok) {
      setResendState("sent");
    } else {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setServerError(json.error ?? "Failed to resend. Please try again.");
      setResendState("error");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex flex-col gap-4"
    >
      {isBanned && (
        <div className="bg-neon-red/10 border border-neon-red/30 rounded-lg px-4 py-2 text-sm text-neon-red">
          Your account has been suspended. Contact support if you believe this is a mistake.
        </div>
      )}

      {(justRegistered || justVerified) && (
        <div className="flex items-center gap-2 bg-neon-green/10 border border-neon-green/30 rounded-lg px-4 py-2 text-sm text-neon-green">
          <CheckCircle size={14} />
          {justVerified ? "Email verified! Sign in below." : "Account created! Sign in below."}
        </div>
      )}

      {needsVerification && (
        <div className="bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-neon-yellow">
            <Mail size={14} />
            <span className="font-medium">Email not verified</span>
          </div>
          <p className="text-xs text-text-muted">
            Check your inbox at <span className="text-text-primary">{verificationEmail}</span> and click the verification link.
          </p>
          {resendState === "sent" ? (
            <p className="text-xs text-neon-green flex items-center gap-1">
              <CheckCircle size={11} /> Verification email resent!
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resendState === "sending"}
              className="text-xs text-neon-blue hover:underline disabled:opacity-50 text-left w-fit"
            >
              {resendState === "sending" ? "Sending..." : "Resend verification email"}
            </button>
          )}
        </div>
      )}

      {serverError && !needsVerification && (
        <div className="bg-neon-red/10 border border-neon-red/30 rounded-lg px-4 py-2 text-sm text-neon-red">
          {serverError}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type={showPassword ? "text" : "password"}
        placeholder="Your password"
        error={errors.password?.message}
        rightElement={
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-text-muted hover:text-text-primary transition-colors" tabIndex={-1}>
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
        {...register("password")}
      />

      <Button type="submit" loading={isSubmitting} className="mt-2">
        Sign In
      </Button>

      <p className="text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-neon-blue hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
