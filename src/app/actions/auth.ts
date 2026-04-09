"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function loginAction(email: string, password: string): Promise<{ error?: string }> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw e;
  }
}
