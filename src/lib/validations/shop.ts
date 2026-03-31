import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  categoryId: z.string().min(1),
  type: z.enum(["PERIPHERAL", "MERCH", "GIFT_CARD", "IN_GAME_ITEM"]),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(-1),
  description: z.string().min(10),
  imageKeys: z.array(z.string()).max(6).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional().default("DRAFT"),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(300).optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
