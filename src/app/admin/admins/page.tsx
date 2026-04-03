import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminsManager } from "./AdminsManager";

export default async function AdminsPage() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect("/admin");

  return <AdminsManager />;
}
