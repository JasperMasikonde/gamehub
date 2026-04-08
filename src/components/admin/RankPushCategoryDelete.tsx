"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RankPushCategoryDelete({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const del = async () => {
    setLoading(true);
    await fetch(`/api/admin/rank-push/categories/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  };

  if (confirm) {
    return (
      <div className="flex gap-1">
        <Button variant="danger" size="sm" onClick={del} disabled={loading}>
          {loading ? <Loader2 size={11} className="animate-spin" /> : "Yes, delete"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
      <Trash2 size={13} className="text-neon-red" />
    </Button>
  );
}
