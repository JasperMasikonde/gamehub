"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ShieldCheck, RefreshCw } from "lucide-react";
import type { TransactionStatus } from "@prisma/client";

export function EscrowActionPanel({
  transactionId,
  currentStatus,
}: {
  transactionId: string;
  currentStatus: TransactionStatus;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"release" | "refund" | null>(null);

  const act = async (action: "release" | "refund") => {
    setLoading(action);
    await fetch(`/api/admin/escrow/${transactionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    setLoading(null);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold">Manual Escrow Control</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Override the escrow outcome manually (current: {currentStatus})
        </p>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Admin note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2 mt-3">
          <Button
            variant="primary"
            size="sm"
            loading={loading === "release"}
            onClick={() => act("release")}
            className="flex-1"
          >
            <ShieldCheck size={13} />
            Release to Seller
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={loading === "refund"}
            onClick={() => act("refund")}
            className="flex-1"
          >
            <RefreshCw size={13} />
            Refund Buyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
