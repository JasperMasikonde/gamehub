"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Check, X } from "lucide-react";
import type { ListingStatus } from "@prisma/client";

export function AdminListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: ListingStatus;
}) {
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const act = async (action: string, body?: object) => {
    setLoading(true);
    await fetch(`/api/admin/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1.5">
      {status === "PENDING_APPROVAL" && (
        <Button
          size="sm"
          variant="primary"
          loading={loading}
          onClick={() => act("approve")}
        >
          <Check size={12} />
          Approve
        </Button>
      )}
      {status !== "REMOVED" && (
        <>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setRemoveOpen(true)}
          >
            <X size={12} />
            Remove
          </Button>
          <Modal
            isOpen={removeOpen}
            onClose={() => setRemoveOpen(false)}
            title="Remove Listing"
          >
            <div className="flex flex-col gap-3">
              <Textarea
                label="Reason (optional)"
                placeholder="Why is this listing being removed?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setRemoveOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={loading}
                  className="flex-1"
                  onClick={async () => {
                    await act("remove", { reason });
                    setRemoveOpen(false);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
