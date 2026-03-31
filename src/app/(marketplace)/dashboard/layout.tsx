import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-1 min-h-0">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 p-6 overflow-y-auto max-w-5xl">
        {children}
      </main>
    </div>
  );
}
