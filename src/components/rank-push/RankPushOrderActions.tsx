"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  orderId: string;
  status: string;
  role: "client" | "provider";
}

export function RankPushOrderActions({ orderId, status, role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [error, setError] = useState("");

  const act = async (action: "deliver" | "confirm" | "dispute") => {
    setLoading(action);
    setError("");
    try {
      const res = await fetch(`/api/rank-push/orders/${orderId}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "deliver" ? JSON.stringify({ deliveryNote }) : "{}",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        setLoading(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(null);
    setShowDeliveryForm(false);
  };

  if (role === "provider" && status === "IN_PROGRESS") {
    if (showDeliveryForm) {
      return (
        <div className="space-y-2">
          <textarea
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            placeholder="Delivery note for the client (optional)…"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-green/50 resize-none"
          />
          {error && <p className="text-xs text-neon-red">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={loading === "deliver"}
              onClick={() => act("deliver")}
            >
              {loading === "deliver" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <Truck size={12} /> Mark Delivered
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDeliveryForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    return (
      <Button variant="primary" size="sm" onClick={() => setShowDeliveryForm(true)}>
        <Truck size={12} /> Mark as Delivered
      </Button>
    );
  }

  if (role === "client" && status === "DELIVERED") {
    return (
      <div className="flex flex-wrap gap-2">
        {error && <p className="w-full text-xs text-neon-red">{error}</p>}
        <Button
          variant="primary"
          size="sm"
          disabled={loading === "confirm"}
          onClick={() => act("confirm")}
        >
          {loading === "confirm" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <>
              <CheckCircle size={12} /> Confirm & Release Payment
            </>
          )}
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={loading === "dispute"}
          onClick={() => act("dispute")}
        >
          {loading === "dispute" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <>
              <AlertTriangle size={12} /> Dispute
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}
