import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// In-memory rate limiter (per worker instance — resets on cold start)
// ---------------------------------------------------------------------------
const ipRequests = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();

function getRateLimit(pathname: string): { limit: number; windowMs: number } {
  if (pathname.startsWith("/api/auth"))
    return { limit: 10, windowMs: 60_000 };   // 10/min — brute-force guard
  if (pathname.startsWith("/api/"))
    return { limit: 60, windowMs: 60_000 };   // 60/min for API routes
  return { limit: 120, windowMs: 60_000 };    // 120/min for page routes
}

function checkRateLimit(req: NextRequest): NextResponse | null {
  const now = Date.now();

  // Periodic cleanup so the Map doesn't grow unbounded
  if (now - lastCleanup > 5 * 60_000) {
    for (const [key, entry] of ipRequests) {
      if (now > entry.resetAt) ipRequests.delete(key);
    }
    lastCleanup = now;
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??          // Cloudflare
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { pathname } = req.nextUrl;
  const { limit, windowMs } = getRateLimit(pathname);

  // Bucket key groups auth / api / pages separately per IP
  const bucket = pathname.startsWith("/api/auth")
    ? "auth"
    : pathname.startsWith("/api/")
    ? "api"
    : "page";
  const key = `${ip}:${bucket}`;

  const entry = ipRequests.get(key);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "Content-Type": "text/plain",
      },
    });
  }

  return null;
}
// ---------------------------------------------------------------------------

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Rate limiting — applied before auth checks
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

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
