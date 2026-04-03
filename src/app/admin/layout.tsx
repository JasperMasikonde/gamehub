import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import type { AdminPermission } from "@prisma/client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { isSuperAdmin, adminPermissions } = session.user;

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <AdminSidebar
        isSuperAdmin={isSuperAdmin}
        adminPermissions={adminPermissions as AdminPermission[]}
      />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pt-18 md:pt-6">{children}</main>
    </div>
  );
}
