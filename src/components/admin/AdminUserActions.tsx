"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { UserStatus } from "@prisma/client";

export function AdminUserActions({
  userId,
  status,
  isVerifiedSeller,
}: {
  userId: string;
  status: UserStatus;
  isVerifiedSeller: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const act = async (action: string) => {
    setLoading(action);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" ? (
        <Button
          variant="danger"
          size="sm"
          loading={loading === "ban"}
          onClick={() => act("ban")}
        >
          Ban User
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          loading={loading === "unban"}
          onClick={() => act("unban")}
        >
          Unban User
        </Button>
      )}
      {isVerifiedSeller ? (
        <Button
          variant="ghost"
          size="sm"
          loading={loading === "unverify_seller"}
          onClick={() => act("unverify_seller")}
        >
          Remove Verification
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          loading={loading === "verify_seller"}
          onClick={() => act("verify_seller")}
        >
          Verify Seller
        </Button>
      )}
    </div>
  );
}
