import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailToken } from "@/lib/email-verification";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/dashboard?verified=invalid", req.url));
  }

  const payload = await verifyEmailToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/dashboard?verified=invalid", req.url));
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user || user.email !== payload.email) {
    return NextResponse.redirect(new URL("/dashboard?verified=invalid", req.url));
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
