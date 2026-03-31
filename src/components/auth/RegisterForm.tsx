"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerSchema, type RegisterInput } from "@/lib/validations/user";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
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

    const signInResult = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (signInResult?.ok) {
      router.push("/dashboard");
    }
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
        error={errors.username?.message}
        hint="Letters, numbers, and underscores only"
        {...register("username")}
      />
      <Input
        label="Display Name"
        placeholder="Your name (optional)"
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        error={errors.password?.message}
        {...register("password")}
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
