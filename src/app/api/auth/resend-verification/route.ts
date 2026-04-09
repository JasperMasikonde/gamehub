import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateVerificationToken } from "@/lib/email-verification";
import { sendVerificationEmail } from "@/lib/email";

// Simple in-memory cooldown — one resend per user per 60s
const cooldowns = new Map<string, number>();

export async function POST() {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, displayName: true, username: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  // Rate limit: one resend per 60 seconds
  const lastSent = cooldowns.get(user.id) ?? 0;
  const secondsLeft = Math.ceil((lastSent + 60_000 - Date.now()) / 1000);
  if (secondsLeft > 0) {
    return NextResponse.json(
      { error: `Please wait ${secondsLeft}s before requesting another email` },
      { status: 429 }
    );
  }

  cooldowns.set(user.id, Date.now());

  const token = await generateVerificationToken(user.id, user.email);
  sendVerificationEmail({
    toEmail: user.email,
    toName: user.displayName ?? user.username,
    token,
  }).catch(() => null);

  return NextResponse.json({ success: true });
}
