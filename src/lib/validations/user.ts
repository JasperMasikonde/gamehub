import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
    password: z.string().min(8, "At least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
