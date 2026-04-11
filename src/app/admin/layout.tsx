import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Always fetch fresh from DB so permission changes take effect immediately
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, adminPermissions: true },
  });

  const isSuperAdmin = dbUser?.isSuperAdmin ?? false;
  const adminPermissions = dbUser?.adminPermissions ?? [];

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <AdminSidebar
        isSuperAdmin={isSuperAdmin}
        adminPermissions={adminPermissions}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin top bar — notification bell */}
        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-bg-border bg-bg-surface">
          <NotificationBell />
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pt-16 md:pt-4 pb-8">{children}</main>
      </div>
    </div>
  );
}
