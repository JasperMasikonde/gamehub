"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UserResult {
  id: string;
  username: string;
  displayName?: string | null;
  email: string;
  isRankPusher: boolean;
}

export function RankPushUserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/rank-push/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setError("Search failed");
        setSearching(false);
        return;
      }
      const data = await res.json();
      setResults(data.users ?? []);
    } catch {
      setError("Network error");
    }
    setSearching(false);
  };

  const toggle = async (userId: string, current: boolean) => {
    setToggling(userId);
    await fetch(`/api/admin/rank-push/providers/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRankPusher: !current }),
    });
    setResults((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isRankPusher: !current } : u))
    );
    setToggling(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or email…"
          className="flex-1 px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
        />
        <Button variant="outline" size="sm" type="submit" disabled={searching}>
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </Button>
      </form>

      {error && <p className="text-xs text-neon-red">{error}</p>}

      {results.length > 0 && (
        <div className="border border-bg-border rounded-xl divide-y divide-bg-border">
          {results.map((user) => (
            <div key={user.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-text-primary">{user.username}</p>
                <p className="text-xs text-text-muted">{user.email}</p>
              </div>
              <Button
                variant={user.isRankPusher ? "danger" : "outline"}
                size="sm"
                disabled={toggling === user.id}
                onClick={() => toggle(user.id, user.isRankPusher)}
              >
                {toggling === user.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : user.isRankPusher ? (
                  "Revoke Provider"
                ) : (
                  "Make Provider"
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
