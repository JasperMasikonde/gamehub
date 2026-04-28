"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "./ImageUploader";
import { createListingSchema, type CreateListingInput } from "@/lib/validations/listing";
import { Platform } from "@prisma/client";

const PLATFORM_OPTIONS = [
  { value: "PS5", label: "PlayStation 5" },
  { value: "PS4", label: "PlayStation 4" },
  { value: "XBOX", label: "Xbox" },
  { value: "PC", label: "PC" },
  { value: "MOBILE", label: "Mobile" },
];

export function ListingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateListingInput, unknown, CreateListingInput>({
    resolver: zodResolver(createListingSchema) as never,
    defaultValues: {
      platform: Platform.PS5,
      currency: "USD",
      featuredPlayers: [],
      imageKeys: [],
    },
  });

  const onSubmit = async (data: CreateListingInput) => {
    setServerError("");
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Failed to create listing");
      return;
    }

    router.push("/dashboard/sales");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {serverError && (
        <div className="bg-neon-red/10 border border-neon-red/30 rounded-lg px-4 py-2 text-sm text-neon-red">
          {serverError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Input
            label="Listing Title"
            placeholder="e.g. eFootball PS5 Account – 99 Messi, Division 1"
            error={errors.title?.message}
            {...register("title")}
          />
        </div>

        <div className="md:col-span-2">
          <Textarea
            label="Description"
            placeholder="Describe the account in detail — squad quality, achievements, coins, etc."
            error={errors.description?.message}
            rows={5}
            {...register("description")}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text-subtle block mb-1">
            Platform
          </label>
          <Controller
            control={control}
            name="platform"
            render={({ field }) => (
              <select
                {...field}
                className="w-full rounded-lg border border-bg-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-neon-blue"
              >
                {PLATFORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        <Input
          type="number"
          label="Price (USD)"
          placeholder="e.g. 49.99"
          step="0.01"
          error={errors.price?.message}
          {...register("price", { valueAsNumber: true })}
        />

        <Input
          label="Region"
          placeholder="e.g. Global, Europe, Japan"
          error={errors.region?.message}
          {...register("region")}
        />

        <Input
          label="Division / Rank"
          placeholder="e.g. Division 1, Top 100"
          error={errors.division?.message}
          {...register("division")}
        />

        <div>
          <Input
            type="number"
            label="Account Level"
            placeholder="e.g. 55"
            error={errors.accountLevel?.message}
            {...register("accountLevel", { valueAsNumber: true })}
          />
          <p className="text-xs text-text-muted mt-1">Your in-game account level (1–500). Not GP or rank points.</p>
        </div>

        <div>
          <Input
            type="number"
            label="Squad Overall Rating"
            placeholder="e.g. 90"
            error={errors.overallRating?.message}
            {...register("overallRating", { valueAsNumber: true })}
          />
          <p className="text-xs text-text-muted mt-1">Average squad rating (50–99).</p>
        </div>

        <Input
          type="number"
          label="eFootball Coins"
          placeholder="e.g. 50000"
          error={errors.coins?.message}
          {...register("coins", { valueAsNumber: true })}
        />

        <Input
          type="number"
          label="GP (Game Points)"
          placeholder="e.g. 1000000"
          error={errors.gpAmount?.message}
          {...register("gpAmount", { valueAsNumber: true })}
        />

        <div className="md:col-span-2">
          <Input
            label="Featured Players (comma separated)"
            placeholder="e.g. Messi, Ronaldo, Mbappe"
            onChange={(e) => {
              const val = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              setValue("featuredPlayers", val);
            }}
          />
        </div>

        <div className="md:col-span-2">
          <Controller
            control={control}
            name="imageKeys"
            render={() => (
              <ImageUploader
                onChange={(keys) => setValue("imageKeys", keys)}
              />
            )}
          />
          {errors.imageKeys && (
            <p className="text-xs text-neon-red mt-1">
              {errors.imageKeys.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Submit Listing
        </Button>
      </div>
    </form>
  );
}
