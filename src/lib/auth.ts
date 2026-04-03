import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { AdminPermission, Role, UserStatus } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
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
          },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status === "BANNED") return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

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
        };
      },
    }),
  ],
});

/** Throws a 401 response if not authenticated */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  return session.user;
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
