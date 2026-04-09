import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120, "Name can't exceed 120 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").max(120, "Slug can't exceed 120 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  categoryId: z.string().min(1, "Select a category"),
  type: z.enum(["PERIPHERAL", "MERCH", "GIFT_CARD", "IN_GAME_ITEM"], { message: "Select a product type" }),
  price: z.coerce.number({ error: "Enter a valid price" }).positive("Price must be greater than 0"),
  stock: z.coerce.number({ error: "Enter a valid stock amount" }).int().min(-1, "Stock can't be less than -1"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageKeys: z.array(z.string()).max(6, "You can upload up to 6 images").optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional().default("DRAFT"),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60, "Name can't exceed 60 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").max(60, "Slug can't exceed 60 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(300, "Description can't exceed 300 characters").optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
