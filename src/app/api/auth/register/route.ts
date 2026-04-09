import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/user";
import { sendWelcomeEmail, sendVerificationEmail } from "@/lib/email";
import { generateVerificationToken } from "@/lib/email-verification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json(
        { error: "Invalid input", details: data.error.flatten() },
        { status: 400 }
      );
    }

    const { email: rawEmail, username, password } = data.data;
    const email = rawEmail.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      const field = existing.email === email ? "email" : "username";
      return NextResponse.json(
        { error: `This ${field} is already taken` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: username,
        passwordHash,
      },
      select: { id: true, email: true, username: true },
    });

    // Seed SiteConfig if it doesn't exist
    await prisma.siteConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", updatedAt: new Date() },
      update: {},
    });

    // Send emails — log errors so we can see SMTP failures in server logs
    sendWelcomeEmail({ toEmail: email, toName: username }).catch((err) =>
      console.error("[email] welcome failed:", err.message)
    );
    generateVerificationToken(user.id, email).then((token) =>
      sendVerificationEmail({ toEmail: email, toName: username, token })
    ).catch((err) =>
      console.error("[email] verification failed:", err.message)
    );

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
