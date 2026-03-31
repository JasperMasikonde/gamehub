import { z } from "zod";

export const createTransactionSchema = z.object({
  listingId: z.string().cuid(),
});

export const deliverCredentialsSchema = z.object({
  accountEmail: z.string().email(),
  accountPassword: z.string().min(1),
  accountUsername: z.string().optional(),
  notes: z.string().max(500).optional(),
  screenshotGcsKeys: z.array(z.string()).max(6).optional(),
});

export const raiseDisputeSchema = z.object({
  reason: z.string().min(20).max(1000),
  evidenceKeys: z.array(z.string()).max(5).optional(),
});

export const resolveDisputeSchema = z.object({
  resolution: z.string().min(10).max(1000),
  outcome: z.enum(["BUYER", "SELLER"]),
});
