"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShieldCheck } from "lucide-react";

export function BuyButton({ listingId }: { listingId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBuy = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Purchase failed");
      setLoading(false);
      return;
    }

    const { transaction } = await res.json();
    router.push(`/dashboard/escrow/${transaction.id}`);
  };

  if (!session?.user) {
    return (
      <Button
        variant="primary"
        className="w-full"
        onClick={() => router.push("/login")}
      >
        Sign in to Buy
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        className="w-full"
        onClick={() => setShowModal(true)}
      >
        Buy Now — Escrow Protected
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Confirm Purchase"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-bg-surface rounded-lg p-3 text-sm text-text-subtle">
            <p className="flex items-center gap-1.5 text-neon-green font-medium mb-1">
              <ShieldCheck size={14} /> How escrow works
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-text-muted">
              <li>Pay via M-Pesa — funds held securely in escrow</li>
              <li>The seller delivers the account credentials</li>
              <li>You confirm receipt within 3 days</li>
              <li>Funds are released to the seller</li>
              <li>Raise a dispute if anything is wrong</li>
            </ol>
          </div>

          {error && (
            <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button loading={loading} className="flex-1" onClick={handleBuy}>
              Continue to Payment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
