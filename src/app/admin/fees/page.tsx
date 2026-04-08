export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeeRuleForm } from "@/components/admin/FeeRuleForm";
import { FeeRuleDeleteButton } from "@/components/admin/FeeRuleDeleteButton";
import { EscrowFeeForm } from "@/components/admin/EscrowFeeForm";
import { ShoppingBag, Swords } from "lucide-react";

export default async function AdminFeesPage() {
  await requireAdmin();

  const [rules, config] = await Promise.all([
    prisma.platformFeeRule.findMany({ orderBy: { minWager: "asc" } }),
    prisma.siteConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const escrowFeeRate = Number(config?.platformFeeRate ?? 0.05) * 100;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform Fee Rules</h1>
        <p className="text-text-muted text-sm mt-1">Configure what Eshabiki charges per product/service</p>
      </div>

      {/* ── Escrow / Marketplace fee ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-neon-green" />
          <h2 className="text-base font-semibold">Marketplace (Account Sales) Fee</h2>
        </div>
        <p className="text-xs text-text-muted -mt-2">
          A percentage of the sale price deducted before paying out the seller. Applies to all escrow transactions.
        </p>
        <EscrowFeeForm currentRate={escrowFeeRate} />
      </section>

      <hr className="border-bg-border" />

      {/* ── Challenge fee rules ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-neon-purple" />
          <h2 className="text-base font-semibold">Challenge Fee Rules</h2>
        </div>
        <p className="text-xs text-text-muted -mt-2">
          A flat KES fee charged per challenge wager tier. Each rule covers a wager range — ranges must not overlap.
        </p>

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
                <tr><td colSpan={5} className="p-8 text-center text-text-muted">No challenge fee rules yet. Add the first one above.</td></tr>
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
      </section>
    </div>
  );
}
