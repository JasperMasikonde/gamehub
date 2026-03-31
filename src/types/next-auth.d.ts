import type { Role, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      displayName?: string | null;
      image?: string | null;
      role: Role;
      status: UserStatus;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string | null;
    image?: string | null;
    role: Role;
    status: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    status: UserStatus;
  }
}
