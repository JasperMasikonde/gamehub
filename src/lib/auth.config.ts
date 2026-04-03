import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config — no Node.js imports (no bcrypt, no Prisma, no pg)
// Used by middleware for JWT verification only.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [], // providers are added in auth.ts (Node.js only)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.id = u.id;
        token.username = u.username;
        token.role = u.role;
        token.status = u.status;
        token.isSuperAdmin = u.isSuperAdmin ?? false;
        token.adminPermissions = u.adminPermissions ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as any;
        u.id = token.id;
        u.username = token.username;
        u.role = token.role;
        u.status = token.status;
        u.isSuperAdmin = token.isSuperAdmin ?? false;
        u.adminPermissions = token.adminPermissions ?? [];
      }
      return session;
    },
  },
};
