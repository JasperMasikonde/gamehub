import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { AdminPermission, Role, UserStatus } from "@prisma/client";

/** Generate a unique username from a Google display name or email. */
async function generateGoogleUsername(seed: string): Promise<string> {
  // Use the part before @ for emails, strip non-alphanumeric chars
  const base = seed
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20) || "user";

  // Try the base first, then add random suffixes until unique
  const candidates = [base, ...Array.from({ length: 5 }, () => `${base}${Math.floor(1000 + Math.random() * 9000)}`)];
  for (const name of candidates) {
    const taken = await prisma.user.findUnique({ where: { username: name }, select: { id: true } });
    if (!taken) return name;
  }
  // Fallback: cuid-based unique name
  return `user${Date.now().toString(36)}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    // Keep the session callback from authConfig unchanged
    ...authConfig.callbacks,
    // Override jwt to also handle trigger === "update" (session refresh)
    async jwt({ token, user, account, trigger }) {
      // Google OAuth sign-in: look up (or already-created) DB user by email
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            status: true,
            isSuperAdmin: true,
            adminPermissions: true,
            isRankPusher: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.isSuperAdmin = dbUser.isSuperAdmin;
          token.adminPermissions = dbUser.adminPermissions;
          token.isRankPusher = dbUser.isRankPusher;
        }
        return token;
      }

      // Initial sign-in: populate token from the user object returned by authorize()
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.id = u.id;
        token.username = u.username;
        token.role = u.role;
        token.status = u.status;
        token.isSuperAdmin = u.isSuperAdmin ?? false;
        token.adminPermissions = u.adminPermissions ?? [];
        token.isRankPusher = u.isRankPusher ?? false;
      }

      // Session update (triggered by updateSession() on the client, e.g. after role promotion)
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            status: true,
            isSuperAdmin: true,
            adminPermissions: true,
            isRankPusher: true,
          },
        });
        if (fresh) {
          token.role = fresh.role;
          token.status = fresh.status;
          token.isSuperAdmin = fresh.isSuperAdmin;
          token.adminPermissions = fresh.adminPermissions;
          token.isRankPusher = fresh.isRankPusher;
        }
      }

      return token;
    },

    async signIn({ user, account }) {
      // Only intercept Google OAuth — credentials flow is handled by authorize()
      if (account?.provider === "google") {
        if (!user.email) return false;

        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, status: true },
        });

        if (existing) {
          // Block banned accounts
          if (existing.status === "BANNED") return "/login?banned=1";
          // Update avatar if Google provides one and we don't have one stored
          if (user.image) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { avatarUrl: user.image },
            });
          }
          return true;
        }

        // New Google user — provision an account automatically
        const username = await generateGoogleUsername(user.name ?? user.email);
        await prisma.user.create({
          data: {
            email: user.email,
            username,
            displayName: user.name ?? username,
            avatarUrl: user.image ?? null,
            emailVerified: new Date(),
            status: "ACTIVE",
          },
        });

        // Seed SiteConfig if it doesn't exist yet
        await prisma.siteConfig.upsert({
          where: { id: "singleton" },
          create: { id: "singleton", updatedAt: new Date() },
          update: {},
        });

        return true;
      }
      return true;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            status: true,
            passwordHash: true,
            isSuperAdmin: true,
            adminPermissions: true,
            isRankPusher: true,
            emailVerified: true,
          },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status === "BANNED") return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        if (!user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          image: user.avatarUrl,
          role: user.role,
          status: user.status,
          isSuperAdmin: user.isSuperAdmin,
          adminPermissions: user.adminPermissions,
          isRankPusher: user.isRankPusher,
        };
      },
    }),
  ],
});

/** Returns a session-compatible object for either a NextAuth session or an agent bearer token. */
export async function resolveSession() {
  const session = await auth();
  if (session) return session;

  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const agent = await prisma.user.findUnique({
      where: { agentToken: token, isAgent: true },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        isSuperAdmin: true,
        adminPermissions: true,
      },
    });
    if (agent && agent.role === "ADMIN" && agent.status === "ACTIVE") {
      return {
        user: {
          id: agent.id,
          email: agent.email,
          username: agent.username,
          displayName: agent.displayName,
          image: agent.avatarUrl,
          role: agent.role as Role,
          status: agent.status as UserStatus,
          isSuperAdmin: agent.isSuperAdmin,
          adminPermissions: agent.adminPermissions as AdminPermission[],
        },
        expires: new Date(Date.now() + 86400_000).toISOString(),
      };
    }
  }

  return null;
}

/** Throws a 401 response if not authenticated */
export async function requireAuth() {
  const session = await auth();
  if (session?.user) return session.user;

  // Fallback: agent bearer token auth
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const agent = await prisma.user.findUnique({
      where: { agentToken: token, isAgent: true },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        isSuperAdmin: true,
        adminPermissions: true,
      },
    });
    if (agent && agent.role === "ADMIN" && agent.status === "ACTIVE") {
      return {
        id: agent.id,
        email: agent.email,
        username: agent.username,
        displayName: agent.displayName,
        image: agent.avatarUrl,
        role: agent.role as Role,
        status: agent.status as UserStatus,
        isSuperAdmin: agent.isSuperAdmin,
        adminPermissions: agent.adminPermissions as AdminPermission[],
      };
    }
  }

  throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

/** Throws a 403 response if not admin */
export async function requireAdmin() {
  const user = await requireAuth();
  if ((user as { role: Role }).role !== "ADMIN") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  return user as typeof user & { role: Role; status: UserStatus; isSuperAdmin: boolean; adminPermissions: AdminPermission[] };
}

/** Throws a 403 response if not super admin — always checks DB */
export async function requireSuperAdmin() {
  const user = await requireAdmin();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isSuperAdmin: true },
  });
  if (!dbUser?.isSuperAdmin) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  return user;
}

/** Throws a 403 response if admin lacks the given permission (super admin always passes) */
export async function requirePermission(permission: AdminPermission) {
  const user = await requireAdmin();
  if (user.isSuperAdmin) return user;

  // Always check DB for fresh permissions
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isSuperAdmin: true, adminPermissions: true },
  });

  if (!fresh?.isSuperAdmin && !fresh?.adminPermissions.includes(permission)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  return user;
}
