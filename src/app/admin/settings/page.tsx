import { prisma } from "@/lib/prisma";
import { AdminNotificationEmailForm } from "@/components/admin/AdminNotificationEmailForm";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  const adminNotificationEmail = config?.adminNotificationEmail ?? null;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings size={20} className="text-neon-blue" />
          Admin Settings
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Platform-wide configuration</p>
      </div>

      <Card>
        <CardContent>
          <AdminNotificationEmailForm currentEmail={adminNotificationEmail} />
        </CardContent>
      </Card>

      <div className="text-xs text-text-muted space-y-1 px-1">
        <p className="font-medium text-text-primary">What triggers a notification?</p>
        <ul className="list-disc list-inside space-y-0.5 text-text-muted">
          <li>A buyer raises a dispute on a transaction</li>
          <li>A seller submits a new listing for approval</li>
          <li>Both players agree on a challenge result (payout required)</li>
        </ul>
      </div>
    </div>
  );
}
