export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeeRuleForm } from "@/components/admin/FeeRuleForm";
import { FeeRuleDeleteButton } from "@/components/admin/FeeRuleDeleteButton";

export default async function AdminFeesPage() {
  await requireAdmin();
  const rules = await prisma.platformFeeRule.findMany({ orderBy: { minWager: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Fee Rules</h1>
        <p className="text-text-muted text-sm mt-1">Define how much GameHub charges per wager tier on challenges</p>
      </div>

      <FeeRuleForm />

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="text-left p-4 text-text-muted font-medium">Label</th>
              <th className="text-left p-4 text-text-muted font-medium">Wager Range (KES)</th>
              <th className="text-left p-4 text-text-muted font-medium">Platform Fee (KES)</th>
              <th className="text-left p-4 text-text-muted font-medium">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {rules.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-text-muted">No fee rules yet. Add the first one above.</td></tr>
            )}
            {rules.map(r => (
              <tr key={r.id} className="hover:bg-bg-elevated transition-colors">
                <td className="p-4 font-medium">{r.label}</td>
                <td className="p-4 text-text-muted">
                  KES {Number(r.minWager).toLocaleString()} – {Number(r.maxWager).toLocaleString()}
                </td>
                <td className="p-4 font-bold text-neon-green">KES {Number(r.fee).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${r.isActive ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-text-muted/10 text-text-muted border-bg-border"}`}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <FeeRuleDeleteButton id={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-bg-elevated border border-bg-border rounded-xl p-4 text-sm text-text-muted">
        <p>💡 When a user creates a challenge, the platform fee is automatically calculated based on the wager amount and shown before confirmation. Ranges should not overlap.</p>
      </div>
    </div>
  );
}
