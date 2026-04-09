"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LedgerEntry } from "@/app/api/admin/accounting/ledger/route";

const TYPE_COLORS: Record<LedgerEntry["type"], string> = {
  MARKETPLACE: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
  CHALLENGE: "bg-neon-purple/10 text-neon-purple border-neon-purple/20",
  SHOP: "bg-neon-green/10 text-neon-green border-neon-green/20",
  RANK_PUSH: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/20",
  TOURNAMENT: "bg-orange-400/10 text-orange-400 border-orange-400/20",
};

const TYPES: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "CHALLENGE", label: "Challenges" },
  { value: "SHOP", label: "Shop" },
  { value: "RANK_PUSH", label: "Rank Push" },
  { value: "TOURNAMENT", label: "Tournaments" },
];

export function LedgerTable() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/accounting/ledger?${params}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, type, from, to]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalPages = Math.ceil(total / 50);
  const pageRevenue = entries.reduce((s, e) => s + e.revenue, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
        <div className="flex gap-1 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setType(t.value); setPage(1); }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                type === t.value
                  ? "bg-neon-green/10 text-neon-green border-neon-green/30"
                  : "border-bg-border text-text-muted hover:text-text-primary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="text-xs px-2 py-1.5 rounded-lg border border-bg-border bg-bg-elevated text-text-primary focus:outline-none focus:border-neon-green/50"
          />
          <span className="text-xs text-text-muted">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="text-xs px-2 py-1.5 rounded-lg border border-bg-border bg-bg-elevated text-text-primary focus:outline-none focus:border-neon-green/50"
          />
        </div>
      </div>

      {/* Summary strip */}
      <div className="mx-4 px-4 py-2.5 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-between text-xs">
        <span className="text-text-muted">{total.toLocaleString()} entries</span>
        <span className="font-semibold text-neon-green">
          Page revenue: {formatCurrency(pageRevenue.toFixed(2))}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-y border-bg-border text-text-muted">
              <th className="text-left px-4 py-2.5">Date</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-left px-4 py-2.5">Description</th>
              <th className="text-left px-4 py-2.5">Party</th>
              <th className="text-right px-4 py-2.5">Gross</th>
              <th className="text-right px-4 py-2.5">Platform Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Loader2 size={16} className="animate-spin inline" />
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">No entries found</td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-bg-elevated/40 transition-colors">
                  <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{e.date.slice(0, 10)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap", TYPE_COLORS[e.type])}>
                      {e.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-w-[180px] truncate text-text-primary">{e.description}</td>
                  <td className="px-4 py-2.5 text-text-muted max-w-[140px] truncate">{e.party}</td>
                  <td className="px-4 py-2.5 text-right text-text-muted">{formatCurrency(e.gross.toFixed(2))}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-neon-green">{formatCurrency(e.revenue.toFixed(2))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 pb-4 text-xs">
          <span className="text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-bg-border text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-bg-border text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
