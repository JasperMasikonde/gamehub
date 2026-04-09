import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailToken } from "@/lib/email-verification";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://eshabiki.com";

function redirect(path: string) {
  return NextResponse.redirect(`${BASE_URL}${path}`);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) return redirect("/dashboard?verified=invalid");

  const payload = await verifyEmailToken(token);
  if (!payload) return redirect("/dashboard?verified=invalid");

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user || user.email !== payload.email) return redirect("/dashboard?verified=invalid");

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  return redirect("/dashboard?verified=1");
}
