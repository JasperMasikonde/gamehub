import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateVerificationToken } from "@/lib/email-verification";
import { sendVerificationEmail } from "@/lib/email";

// Simple in-memory cooldown — one resend per user per 60s
const cooldowns = new Map<string, number>();

export async function POST(req: Request) {
  let userId: string;
  let userEmail: string;
  let userName: string;

  const session = await resolveSession();

  if (session?.user) {
    // Authenticated path
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, displayName: true, username: true, emailVerified: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    userId = user.id;
    userEmail = user.email;
    userName = user.displayName ?? user.username;
  } else {
    // Unauthenticated path — requires email in body
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : null;
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, username: true, emailVerified: true },
    });
    if (!user) return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    userId = user.id;
    userEmail = user.email;
    userName = user.displayName ?? user.username;
  }

  // Rate limit: one resend per 60 seconds
  const lastSent = cooldowns.get(userId) ?? 0;
  const secondsLeft = Math.ceil((lastSent + 60_000 - Date.now()) / 1000);
  if (secondsLeft > 0) {
    return NextResponse.json(
      { error: `Please wait ${secondsLeft}s before requesting another email` },
      { status: 429 }
    );
  }

  cooldowns.set(userId, Date.now());

  const token = await generateVerificationToken(userId, userEmail);
  sendVerificationEmail({ toEmail: userEmail, toName: userName, token }).catch((err) =>
    console.error("[email] resend-verification failed:", err.message)
  );

  return NextResponse.json({ success: true });
}
