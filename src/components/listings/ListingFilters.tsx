"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, SlidersHorizontal } from "lucide-react";
import { Platform } from "@prisma/client";

const PLATFORMS = Object.values(Platform);
const PLATFORM_LABELS: Record<Platform, string> = {
  PS5: "PS5",
  PS4: "PS4",
  XBOX: "Xbox",
  PC: "PC",
  MOBILE: "Mobile",
};

export function ListingFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [platform, setPlatform] = useState(params.get("platform") ?? "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");

  const apply = () => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (platform) p.set("platform", platform);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    router.push(`/listings?${p.toString()}`);
  };

  const clear = () => {
    setSearch("");
    setPlatform("");
    setMinPrice("");
    setMaxPrice("");
    router.push("/listings");
  };

  return (
    <div className="bg-bg-surface border border-bg-border rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-text-subtle">
        <SlidersHorizontal size={15} />
        Filters
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-bg-border bg-bg-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-neon-blue"
          />
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Platform</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setPlatform("")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                !platform
                  ? "bg-neon-blue/20 border-neon-blue text-neon-blue"
                  : "border-bg-border text-text-muted hover:border-text-muted"
              }`}
            >
              All
            </button>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  platform === p
                    ? "bg-neon-blue/20 border-neon-blue text-neon-blue"
                    : "border-bg-border text-text-muted hover:border-text-muted"
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min $"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="text-xs"
          />
          <Input
            type="number"
            placeholder="Max $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={apply} size="sm" className="flex-1">
            Apply
          </Button>
          <Button onClick={clear} variant="ghost" size="sm">
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
