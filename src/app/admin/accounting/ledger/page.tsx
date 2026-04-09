import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { LedgerTable } from "@/components/accounting/LedgerTable";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!dbUser?.isSuperAdmin) redirect("/admin");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/accounting" className="text-xs text-text-muted hover:text-text-primary mb-2 inline-block">
          ← Accounting Overview
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-neon-green" />
          <h1 className="text-xl font-bold">Transaction Ledger</h1>
        </div>
        <p className="text-sm text-text-muted mt-0.5">All revenue entries across every stream</p>
      </div>

      <Card>
        <LedgerTable />
      </Card>
    </div>
  );
}
