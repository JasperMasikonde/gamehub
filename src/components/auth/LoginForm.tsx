"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginSchema, type LoginInput } from "@/lib/validations/user";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const next = searchParams.get("next");
  // Only allow relative paths to prevent open redirect
  const redirectTo = next?.startsWith("/") ? next : "/dashboard";

  // Fallback: NextAuth may redirect back with ?error= if something bypasses the action
  const urlError = searchParams.get("error");
  const [serverError, setServerError] = useState(
    urlError ? "Invalid email or password" : ""
  );
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
    const result = await loginAction(data.email, data.password);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    // Hard redirect forces a full session reload — avoids stale session in production
    window.location.href = redirectTo;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex flex-col gap-4"
    >
      {justRegistered && (
        <div className="flex items-center gap-2 bg-neon-green/10 border border-neon-green/30 rounded-lg px-4 py-2 text-sm text-neon-green">
          <CheckCircle size={14} />
          Account created! Sign in below.
        </div>
      )}

      {serverError && (
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
