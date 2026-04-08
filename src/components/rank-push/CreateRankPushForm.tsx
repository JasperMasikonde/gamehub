"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
}

export function CreateRankPushForm({ categories }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/rank-push/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, categoryId, price: Number(price), description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create listing");
        setSubmitting(false);
        return;
      }
      router.push(`/rank-push/${data.listing.id}`);
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Service Title <span className="text-neon-red">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. I'll push your account to Division 1"
          required
          className="w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-green/50 transition-colors"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Category <span className="text-neon-red">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary text-sm focus:outline-none focus:border-neon-green/50 transition-colors"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Price (KES) <span className="text-neon-red">*</span>
        </label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 500"
          required
          min={1}
          step="any"
          className="w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-green/50 transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your service, what rank you can push to, how long it takes, etc."
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-green/50 transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button variant="primary" className="w-full" type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Creating…
          </>
        ) : (
          "Create Listing"
        )}
      </Button>
    </form>
  );
}
