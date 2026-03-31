"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function FeeRuleDeleteButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function del() {
    if (!confirm("Delete this fee rule?")) return;
    setLoading(true);
    await fetch(`/api/admin/fees/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }
  return (
    <button onClick={del} disabled={loading} className="text-text-muted hover:text-neon-red transition-colors p-1 disabled:opacity-40">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
