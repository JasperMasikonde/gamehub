"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginSchema, type LoginInput } from "@/lib/validations/user";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const next = searchParams.get("next");
  // Only allow relative paths to prevent open redirect
  const redirectTo = next?.startsWith("/") ? next : "/dashboard";

  // NextAuth v5 sometimes redirects back with ?error= instead of returning the error object
  const urlError = searchParams.get("error");
  const [serverError, setServerError] = useState(
    urlError ? "Invalid email or password" : ""
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError("");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (!result?.ok) {
      setServerError(
        result?.error === "CredentialsSignin"
          ? "Invalid email or password"
          : (result?.error ?? "Sign in failed — please try again")
      );
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
        type="password"
        placeholder="Your password"
        error={errors.password?.message}
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
