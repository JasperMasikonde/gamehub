import { z } from "zod";
import { Platform } from "@prisma/client";

export const createListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title can't exceed 100 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description can't exceed 2000 characters"),
  price: z.number({ error: "Enter a valid price" }).positive("Price must be greater than 0").max(99999, "Price can't exceed 99,999"),
  currency: z.string().default("USD"),
  platform: z.nativeEnum(Platform, { error: "Select a platform" }),
  region: z.string().optional(),
  division: z.string().optional(),
  accountLevel: z.number({ error: "Enter a valid account level" }).int().min(1, "Account level must be at least 1").max(500, "Account level can't exceed 500 — enter your actual in-game account level, not GP or rank points").optional(),
  coins: z.number({ error: "Enter a valid coin amount" }).int().min(0, "Coins can't be negative").optional(),
  gpAmount: z.number({ error: "Enter a valid GP amount" }).int().min(0, "GP can't be negative").optional(),
  featuredPlayers: z.array(z.string()).max(20, "You can list up to 20 featured players").default([]),
  overallRating: z.number({ error: "Enter a valid rating" }).int().min(50, "Squad overall rating must be at least 50").max(99, "Rating can't exceed 99").optional(),
  imageKeys: z.array(z.string()).min(1, "At least one image is required").max(8, "You can upload up to 8 images"),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema.partial().omit({
  imageKeys: true,
});

export const listingFilterSchema = z.object({
  status: z.string().optional(),
  platform: z.nativeEnum(Platform).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
