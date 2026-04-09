import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email address").toLowerCase().trim(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username can't exceed 30 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password can't exceed 72 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
  password: z.string().min(1, "Enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;
