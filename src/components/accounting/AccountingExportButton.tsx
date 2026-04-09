"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AccountingExportButton({ year }: { year: number }) {
  const [loading, setLoading] = useState(false);
  const [quarter, setQuarter] = useState<string>("");

  const download = async () => {
    setLoading(true);
    const q = quarter ? `&quarter=${quarter}` : "";
    const res = await fetch(`/api/admin/accounting/export?year=${year}${q}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cd = res.headers.get("Content-Disposition") ?? "";
    const match = cd.match(/filename="([^"]+)"/);
    a.download = match?.[1] ?? `accounting-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={quarter}
        onChange={(e) => setQuarter(e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border border-bg-border bg-bg-elevated text-text-primary focus:outline-none focus:border-neon-green/50"
      >
        <option value="">Full Year</option>
        <option value="1">Q1 (Jan–Mar)</option>
        <option value="2">Q2 (Apr–Jun)</option>
        <option value="3">Q3 (Jul–Sep)</option>
        <option value="4">Q4 (Oct–Dec)</option>
      </select>
      <Button size="sm" variant="outline" onClick={download} loading={loading}>
        {!loading && <Download size={14} />}
        Export CSV
      </Button>
    </div>
  );
}
