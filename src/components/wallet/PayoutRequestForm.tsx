"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be positive")
    .min(50, "Minimum payout is KES 50"),
  phone: z.string().min(9, "Enter a valid phone number").max(15),
});

type FormInput = z.infer<typeof schema>;

interface Props {
  balance: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PayoutRequestForm({ balance, onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { amount: Math.floor(balance), phone: "" },
  });

  const onSubmit = async (data: FormInput) => {
    setServerError("");
    if (data.amount > balance) {
      setServerError("Amount exceeds your wallet balance.");
      return;
    }

    const res = await fetch("/api/wallet/payout-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      onSuccess();
    } else {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setServerError(json.error ?? "Failed to submit payout request.");
    }
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(e); }}
      className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3"
    >
      <h3 className="text-sm font-semibold text-text-primary">Request Payout</h3>
      <p className="text-xs text-text-muted">
        Available: <span className="text-neon-green font-medium">KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
      </p>

      {serverError && (
        <div className="bg-neon-red/10 border border-neon-red/30 rounded-lg px-3 py-2 text-xs text-neon-red">
          {serverError}
        </div>
      )}

      <Input
        label="Amount (KES)"
        type="number"
        min={50}
        max={balance}
        step={1}
        error={errors.amount?.message}
        {...register("amount", { valueAsNumber: true })}
      />
      <Input
        label="M-Pesa Phone Number"
        type="tel"
        placeholder="e.g. 0712345678"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <div className="flex gap-2 mt-1">
        <Button type="submit" loading={isSubmitting} size="sm">Submit Request</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
