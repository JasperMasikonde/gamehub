import { z } from "zod";
import { Platform } from "@prisma/client";

export const createListingSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  price: z.number().positive().max(99999),
  currency: z.string().default("USD"),
  platform: z.nativeEnum(Platform),
  region: z.string().optional(),
  division: z.string().optional(),
  accountLevel: z.number().int().positive().optional(),
  coins: z.number().int().min(0).optional(),
  gpAmount: z.number().int().min(0).optional(),
  featuredPlayers: z.array(z.string()).max(20).default([]),
  overallRating: z.number().int().min(1).max(99).optional(),
  imageKeys: z.array(z.string()).min(1, "At least one image is required").max(8),
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
