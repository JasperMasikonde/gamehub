"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

interface CategoryFormProps {
  categoryId?: string;
  defaultValues?: {
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
  };
}

export function CategoryForm({ categoryId, defaultValues = {} }: CategoryFormProps) {
  const router = useRouter();
  const isEdit = !!categoryId;

  const [name, setName] = useState(defaultValues.name ?? "");
  const [slug, setSlug] = useState(defaultValues.slug ?? "");
  const [description, setDescription] = useState(defaultValues.description ?? "");
  const [imageUrl, setImageUrl] = useState(defaultValues.imageUrl ?? "");
  const [sortOrder, setSortOrder] = useState(String(defaultValues.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(defaultValues.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function autoSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function handleNameChange(v: string) {
    setName(v);
    if (!isEdit) setSlug(autoSlug(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = {
        name, slug,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        sortOrder: parseInt(sortOrder),
        isActive,
      };
      const url = isEdit ? `/api/admin/shop/categories/${categoryId}` : "/api/admin/shop/categories";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(JSON.stringify(data.error)); return; }
      router.push("/admin/shop/categories");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
        <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Peripherals" required className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Slug *</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="peripherals" required className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls + " resize-none"} placeholder="Brief description…" />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Image URL</label>
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Sort Order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            <span className="text-sm text-text-muted">Active</span>
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-neon-red">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : isEdit ? "Save Changes" : "Create Category"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
