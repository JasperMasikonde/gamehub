"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RankPushProviderToggle({
  userId,
  isRankPusher,
}: {
  userId: string;
  isRankPusher: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    await fetch(`/api/admin/rank-push/providers/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRankPusher: !isRankPusher }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button
      variant={isRankPusher ? "danger" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : isRankPusher ? (
        "Revoke Provider"
      ) : (
        "Make Provider"
      )}
    </Button>
  );
}
