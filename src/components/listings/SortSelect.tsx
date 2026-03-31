"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

const OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "popular",    label: "Most Viewed" },
  { value: "oldest",     label: "Oldest First" },
];

export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const handleChange = (value: string) => {
    const p = new URLSearchParams(params.toString());
    if (value === "newest") p.delete("sort");
    else p.set("sort", value);
    p.delete("page");
    router.push(`/listings?${p.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={14} className="text-text-muted shrink-0" />
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-neon-blue cursor-pointer"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
