"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RankPushCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/rank-push/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sortOrder: Number(sortOrder) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create category");
        setSubmitting(false);
        return;
      }
      setSuccess(`Category "${data.category.name}" created!`);
      setName("");
      setSortOrder("0");
      router.refresh();
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs text-text-muted mb-1">Category Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Division Push"
          required
          className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-green/50 transition-colors"
        />
      </div>
      <div className="w-24">
        <label className="block text-xs text-text-muted mb-1">Sort Order</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          min={0}
          className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary text-sm focus:outline-none focus:border-neon-green/50 transition-colors"
        />
      </div>
      <Button variant="primary" type="submit" disabled={submitting} size="sm">
        {submitting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            <Plus size={14} /> Add
          </>
        )}
      </Button>
      {error && <p className="w-full text-xs text-neon-red">{error}</p>}
      {success && <p className="w-full text-xs text-neon-green">{success}</p>}
    </form>
  );
}
