import { z } from "zod";

export const createTransactionSchema = z.object({
  listingId: z.string().cuid("Invalid listing"),
});

export const deliverCredentialsSchema = z.object({
  accountEmail: z.string().email("Enter a valid account email"),
  accountPassword: z.string().min(1, "Account password is required"),
  accountUsername: z.string().optional(),
  notes: z.string().max(500, "Notes can't exceed 500 characters").optional(),
  screenshotGcsKeys: z.array(z.string()).max(6, "You can upload up to 6 screenshots").optional(),
});

export const raiseDisputeSchema = z.object({
  reason: z.string().min(20, "Please describe the issue in at least 20 characters").max(1000, "Reason can't exceed 1000 characters"),
  evidenceKeys: z.array(z.string()).max(5, "You can upload up to 5 evidence files").optional(),
});

export const resolveDisputeSchema = z.object({
  resolution: z.string().min(10, "Resolution must be at least 10 characters").max(1000, "Resolution can't exceed 1000 characters"),
  outcome: z.enum(["BUYER", "SELLER"], { message: "Select an outcome" }),
});
