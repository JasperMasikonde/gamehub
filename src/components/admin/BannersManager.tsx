"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Megaphone, Star, Layout, X, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type BannerVariant = "ANNOUNCEMENT" | "HERO" | "FEATURE";
type BannerColor = "GREEN" | "BLUE" | "PURPLE" | "YELLOW" | "RED";

interface Banner {
  id: string;
  isActive: boolean;
  variant: BannerVariant;
  title: string;
  subtitle: string | null;
  badgeText: string | null;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: BannerColor;
  countdownTo: Date | string | null;
  tournamentId: string | null;
  createdAt: Date | string;
  tournament: { id: string; name: string; slug: string } | null;
}

interface Props {
  initialBanners: Banner[];
  tournaments: { id: string; name: string; slug: string; status: string }[];
}

const VARIANT_META: Record<BannerVariant, { label: string; icon: React.ElementType; color: string }> = {
  ANNOUNCEMENT: { label: "Announcement Bar", icon: Megaphone, color: "text-neon-blue bg-neon-blue/10 border-neon-blue/20" },
  HERO:         { label: "Hero Spotlight",   icon: Star,      color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  FEATURE:      { label: "Feature Card",     icon: Layout,    color: "text-neon-green bg-neon-green/10 border-neon-green/20" },
};

const COLOR_SWATCHES: Record<BannerColor, string> = {
  GREEN:  "bg-neon-green",
  BLUE:   "bg-neon-blue",
  PURPLE: "bg-purple-400",
  YELLOW: "bg-yellow-400",
  RED:    "bg-neon-red",
};

const EMPTY_FORM = {
  variant: "HERO" as BannerVariant,
  title: "",
  subtitle: "",
  badgeText: "",
  ctaLabel: "View Tournament",
  ctaUrl: "/tournaments",
  accentColor: "GREEN" as BannerColor,
  countdownTo: "",
  tournamentId: "",
  isActive: false,
};

type FormState = typeof EMPTY_FORM;

export function BannersManager({ initialBanners, tournaments }: Props) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(b: Banner) {
    setEditId(b.id);
    setForm({
      variant: b.variant,
      title: b.title,
      subtitle: b.subtitle ?? "",
      badgeText: b.badgeText ?? "",
      ctaLabel: b.ctaLabel,
      ctaUrl: b.ctaUrl,
      accentColor: b.accentColor,
      countdownTo: b.countdownTo
        ? new Date(b.countdownTo).toISOString().slice(0, 16)
        : "",
      tournamentId: b.tournamentId ?? "",
      isActive: b.isActive,
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const payload = {
        variant: form.variant,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        badgeText: form.badgeText.trim() || null,
        ctaLabel: form.ctaLabel.trim() || "View Tournament",
        ctaUrl: form.ctaUrl.trim() || "/tournaments",
        accentColor: form.accentColor,
        countdownTo: form.countdownTo ? new Date(form.countdownTo).toISOString() : null,
        tournamentId: form.tournamentId || null,
        isActive: form.isActive,
      };

      const url = editId ? `/api/admin/banners/${editId}` : "/api/admin/banners";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }

      if (editId) {
        setBanners(prev => prev.map(b => b.id === editId ? data.banner : b));
      } else {
        setBanners(prev => [data.banner, ...prev]);
      }
      closeForm();
      router.refresh();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function toggleActive(b: Banner) {
    setTogglingId(b.id);
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      const data = await res.json();
      if (res.ok) setBanners(prev => prev.map(x => x.id === b.id ? data.banner : x));
    } finally { setTogglingId(null); }
  }

  async function deleteBanner(id: string) {
    if (!confirm("Delete this banner? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
      if (res.ok) setBanners(prev => prev.filter(b => b.id !== id));
    } finally { setDeletingId(null); }
  }

  const cls = "w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{banners.length} banner{banners.length !== 1 ? "s" : ""}</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-sm font-semibold hover:bg-neon-blue/20 transition-colors"
        >
          <Plus size={15} /> New Banner
        </button>
      </div>

      {/* Banner list */}
      {banners.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-bg-border rounded-2xl">
          <Megaphone size={36} className="mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-muted text-sm">No banners yet. Create one to start promoting tournaments.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => {
            const meta = VARIANT_META[b.variant];
            const Icon = meta.icon;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border transition-colors",
                  b.isActive ? "bg-bg-surface border-bg-border" : "bg-bg-elevated/50 border-bg-border opacity-60"
                )}
              >
                {/* Variant icon */}
                <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", meta.color)}>
                  <Icon size={16} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", meta.color)}>
                      {meta.label}
                    </span>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", COLOR_SWATCHES[b.accentColor])} />
                    {b.isActive ? (
                      <span className="text-[10px] font-bold text-neon-green uppercase tracking-widest">Live</span>
                    ) : (
                      <span className="text-[10px] text-text-muted uppercase tracking-widest">Draft</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-text-primary truncate">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-text-muted truncate">{b.subtitle}</p>}
                  {b.tournament && (
                    <p className="text-[11px] text-text-muted">Linked: {b.tournament.name}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(b)}
                    disabled={togglingId === b.id}
                    title={b.isActive ? "Deactivate" : "Activate"}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      b.isActive
                        ? "bg-neon-green/10 border border-neon-green/20 text-neon-green hover:bg-neon-green/20"
                        : "bg-bg-elevated border border-bg-border text-text-muted hover:text-text-primary"
                    )}
                  >
                    {togglingId === b.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : b.isActive ? (
                      <Eye size={13} />
                    ) : (
                      <EyeOff size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    title="Edit"
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-bg-elevated border border-bg-border text-text-muted hover:text-neon-blue hover:border-neon-blue/30 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteBanner(b.id)}
                    disabled={deletingId === b.id}
                    title="Delete"
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-bg-elevated border border-bg-border text-text-muted hover:text-neon-red hover:border-neon-red/30 transition-colors"
                  >
                    {deletingId === b.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-8">
          <div className="w-full max-w-xl bg-bg-surface border border-bg-border rounded-2xl shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
              <h2 className="font-bold text-base">{editId ? "Edit Banner" : "New Banner"}</h2>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Variant */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Banner Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ANNOUNCEMENT", "HERO", "FEATURE"] as BannerVariant[]).map(v => {
                    const m = VARIANT_META[v];
                    const Icon = m.icon;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set("variant", v)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-colors",
                          form.variant === v ? m.color : "border-bg-border text-text-muted hover:border-bg-border hover:text-text-primary bg-bg-elevated"
                        )}
                      >
                        <Icon size={18} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Accent Color</label>
                <div className="flex gap-2">
                  {(["GREEN", "BLUE", "PURPLE", "YELLOW", "RED"] as BannerColor[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("accentColor", c)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-transform",
                        COLOR_SWATCHES[c],
                        form.accentColor === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => set("title", e.target.value)}
                  placeholder="e.g. Season 3 League Now Open"
                  className={cls}
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Subtitle</label>
                <input
                  value={form.subtitle}
                  onChange={e => set("subtitle", e.target.value)}
                  placeholder="Short description (optional)"
                  className={cls}
                />
              </div>

              {/* Badge text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Badge Text</label>
                <input
                  value={form.badgeText}
                  onChange={e => set("badgeText", e.target.value)}
                  placeholder="e.g. Registration Open (optional)"
                  className={cls}
                />
              </div>

              {/* CTA row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">CTA Label</label>
                  <input
                    value={form.ctaLabel}
                    onChange={e => set("ctaLabel", e.target.value)}
                    placeholder="View Tournament"
                    className={cls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">CTA URL</label>
                  <input
                    value={form.ctaUrl}
                    onChange={e => set("ctaUrl", e.target.value)}
                    placeholder="/tournaments"
                    className={cls}
                  />
                </div>
              </div>

              {/* Countdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Countdown Target</label>
                <input
                  type="datetime-local"
                  value={form.countdownTo}
                  onChange={e => set("countdownTo", e.target.value)}
                  className={cls}
                />
                <p className="text-[11px] text-text-muted">Displays a live timer on HERO and FEATURE banners.</p>
              </div>

              {/* Linked tournament */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Linked Tournament</label>
                <select
                  value={form.tournamentId}
                  onChange={e => set("tournamentId", e.target.value)}
                  className={cls}
                >
                  <option value="">— None —</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                  ))}
                </select>
                <p className="text-[11px] text-text-muted">Pulls live participant count, game, and prize pool onto the banner.</p>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl bg-bg-elevated border border-bg-border">
                <div
                  onClick={() => set("isActive", !form.isActive)}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    form.isActive ? "bg-neon-green" : "bg-bg-border"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    form.isActive ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{form.isActive ? "Active" : "Draft"}</p>
                  <p className="text-xs text-text-muted">Active banners are visible to all visitors</p>
                </div>
              </label>

              {error && (
                <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-xl px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-neon-blue/15 border border-neon-blue/30 text-neon-blue text-sm font-semibold hover:bg-neon-blue/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editId ? "Save Changes" : "Create Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
