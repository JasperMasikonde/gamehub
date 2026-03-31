"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, Upload, X, Star } from "lucide-react";

interface Category { id: string; name: string; }

interface ProductFormProps {
  categories: Category[];
  gcsBucket: string;
  productId?: string;
  defaultValues?: {
    name?: string;
    slug?: string;
    categoryId?: string;
    type?: string;
    price?: string;
    stock?: number;
    description?: string;
    imageKeys?: string[];
    tags?: string[];
    isFeatured?: boolean;
    status?: string;
  };
}

const PRODUCT_TYPES = ["PERIPHERAL", "MERCH", "GIFT_CARD", "IN_GAME_ITEM"];
const TYPE_LABELS: Record<string, string> = {
  PERIPHERAL: "Peripheral", MERCH: "Merch", GIFT_CARD: "Gift Card", IN_GAME_ITEM: "In-Game Item",
};

export function ProductForm({ categories, gcsBucket, productId, defaultValues = {} }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!productId;

  const [name, setName] = useState(defaultValues.name ?? "");
  const [slug, setSlug] = useState(defaultValues.slug ?? "");
  const [categoryId, setCategoryId] = useState(defaultValues.categoryId ?? "");
  const [type, setType] = useState(defaultValues.type ?? "PERIPHERAL");
  const [price, setPrice] = useState(defaultValues.price ?? "");
  const [stock, setStock] = useState(String(defaultValues.stock ?? 0));
  const [description, setDescription] = useState(defaultValues.description ?? "");
  const [imageKeys, setImageKeys] = useState<string[]>(defaultValues.imageKeys ?? []);
  const [tags, setTags] = useState((defaultValues.tags ?? []).join(", "));
  const [isFeatured, setIsFeatured] = useState(defaultValues.isFeatured ?? false);
  const [status, setStatus] = useState(defaultValues.status ?? "DRAFT");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function autoSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function handleNameChange(v: string) {
    setName(v);
    if (!isEdit) setSlug(autoSlug(v));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || imageKeys.length >= 6) return;
    setUploading(true);
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, filename: file.name, folder: "shop-products" }),
      });
      const { uploadUrl, gcsKey } = await res.json();
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setImageKeys((prev) => [...prev, gcsKey]);
    } catch {
      setError("Image upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(key: string) {
    setImageKeys((prev) => prev.filter((k) => k !== key));
  }

  function gcsUrl(key: string) {
    return `https://storage.googleapis.com/${gcsBucket}/${key}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = {
        name, slug, categoryId, type,
        price: parseFloat(price),
        stock: parseInt(stock),
        description, imageKeys,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        isFeatured, status,
      };
      const url = isEdit ? `/api/admin/shop/products/${productId}` : "/api/admin/shop/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(JSON.stringify(data.error)); return; }
      router.push("/admin/shop/products");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Product Name *</label>
            <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Pro Gaming Headset" required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Slug *</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pro-gaming-headset" required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Category *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={inputCls}>
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Product Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Price (KES) *</label>
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Stock (-1 = unlimited)</label>
              <input type="number" min="-1" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="gaming, headset, wireless" className={inputCls} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded" />
              <Star size={14} className="text-yellow-400" />
              <span className="text-sm text-text-muted">Featured</span>
            </label>
            <div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls + " w-auto"}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Describe the product…"
              className={inputCls + " resize-none"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Images (up to 6)</label>
            <div className="grid grid-cols-3 gap-2">
              {imageKeys.map((key, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-bg-elevated border border-bg-border">
                  <img src={gcsUrl(key)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(key)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bg-base/80 flex items-center justify-center hover:bg-neon-red/20 transition-colors"
                  >
                    <X size={10} className="text-neon-red" />
                  </button>
                </div>
              ))}
              {imageKeys.length < 6 && (
                <label key="upload-btn" className={`aspect-square rounded-xl border-2 border-dashed border-bg-border flex flex-col items-center justify-center cursor-pointer hover:border-neon-blue/40 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {uploading ? <Loader2 size={20} className="animate-spin text-text-muted" /> : <Upload size={20} className="text-text-muted" />}
                  <span className="text-xs text-text-muted mt-1">{uploading ? "Uploading…" : "Upload"}</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-neon-red">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : isEdit ? "Save Changes" : "Create Product"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
