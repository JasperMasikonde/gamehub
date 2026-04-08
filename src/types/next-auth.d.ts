import type { Role, UserStatus, AdminPermission } from "@prisma/client";

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
      isSuperAdmin: boolean;
      adminPermissions: AdminPermission[];
      isRankPusher?: boolean;
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
    isSuperAdmin: boolean;
    adminPermissions: AdminPermission[];
    isRankPusher?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    status: UserStatus;
    isSuperAdmin: boolean;
    adminPermissions: AdminPermission[];
    isRankPusher?: boolean;
  }
}
