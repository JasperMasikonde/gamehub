"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { resolveDisputeSchema } from "@/lib/validations/transaction";
import type { z } from "zod";
import { ShieldCheck, RefreshCw } from "lucide-react";

type Form = z.infer<typeof resolveDisputeSchema>;

export function DisputeResolvePanel({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(resolveDisputeSchema),
  });

  const outcome = watch("outcome");

  const onSubmit = async (data: Form) => {
    setError("");
    const res = await fetch(`/api/disputes/${disputeId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to resolve dispute");
      return;
    }

    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold">Resolve Dispute</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Choose an outcome and provide a resolution note
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <p className="text-xs text-text-muted mb-2">Outcome</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue("outcome", "BUYER")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  outcome === "BUYER"
                    ? "bg-neon-blue/10 border-neon-blue text-neon-blue"
                    : "border-bg-border text-text-muted hover:border-text-muted"
                }`}
              >
                <RefreshCw size={13} />
                Refund Buyer
              </button>
              <button
                type="button"
                onClick={() => setValue("outcome", "SELLER")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  outcome === "SELLER"
                    ? "bg-neon-green/10 border-neon-green text-neon-green"
                    : "border-bg-border text-text-muted hover:border-text-muted"
                }`}
              >
                <ShieldCheck size={13} />
                Release to Seller
              </button>
            </div>
            {errors.outcome && (
              <p className="text-xs text-neon-red mt-1">Please select an outcome</p>
            )}
          </div>

          <Textarea
            label="Resolution Note"
            placeholder="Explain your decision..."
            error={errors.resolution?.message}
            rows={3}
            {...register("resolution")}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            Submit Resolution
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
