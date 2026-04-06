import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Agent API calls use Bearer token auth — let them through, auth.ts validates
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Admin routes: require ADMIN role
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((user as any).role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protected user routes
  const protectedPaths = ["/dashboard", "/listings/create"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/listings/create",
    "/api/admin/:path*",
    "/api/transactions/:path*",
    "/api/disputes/:path*",
    "/api/uploads",
  ],
};
