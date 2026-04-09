"use client";

import { useRouter, useSearchParams } from "next/navigation";

const LAUNCH_YEAR = 2024;
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - LAUNCH_YEAR + 1 }, (_, i) => currentYear - i);

export function AccountingYearSelector({ currentYear: selected }: { currentYear: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-1.5 rounded-lg border border-bg-border bg-bg-elevated text-text-primary focus:outline-none focus:border-neon-green/50"
    >
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}
