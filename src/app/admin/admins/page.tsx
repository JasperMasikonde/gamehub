import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminsManager } from "./AdminsManager";

export default async function AdminsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });

  if (!dbUser?.isSuperAdmin) redirect("/admin");

  return <AdminsManager />;
}
