"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function loginAction(
  email: string,
  password: string
): Promise<{ error?: string; needsVerification?: boolean }> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      // Check if the account exists but email is unverified
      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { emailVerified: true },
      });
      if (user && !user.emailVerified) {
        return {
          error: "Please verify your email before signing in.",
          needsVerification: true,
        };
      }
      return { error: "Invalid email or password" };
    }
    throw e;
  }
}
