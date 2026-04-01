"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerSchema, type RegisterInput } from "@/lib/validations/user";
import Link from "next/link";

export function RegisterForm() {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Registration failed");
      return;
    }

    // Hard redirect to login so the user signs in fresh with their new credentials
    window.location.href = "/login?registered=1";
  };

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)(e);
      }}
      className="flex flex-col gap-4"
    >
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
        label="Username"
        placeholder="gamertag123"
        hint="Letters, numbers, and underscores only"
        error={errors.username?.message}
        {...register("username")}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        label="Confirm Password"
        type="password"
        placeholder="Repeat your password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" loading={isSubmitting} className="mt-2">
        Create Account
      </Button>

      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-neon-blue hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
