"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { CheckCircle, AlertTriangle } from "lucide-react";

export function BuyerActionPanel({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  const confirm = async () => {
    setConfirmLoading(true);
    setError("");
    const res = await fetch(`/api/transactions/${transactionId}/confirm`, {
      method: "POST",
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to confirm");
      setConfirmLoading(false);
      return;
    }

    router.refresh();
  };

  const submitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (reason.trim().length < 20) {
      setError("Please describe the issue in at least 20 characters.");
      return;
    }

    setDisputeLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to raise dispute");
        return;
      }

      setDisputeOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDisputeLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-sm">Your Action Required</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Please confirm you received the account or raise a dispute
        </p>
      </CardHeader>
      <CardContent>
        {error && !disputeOpen && (
          <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/30 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={confirm}
            loading={confirmLoading}
            className="flex-1"
          >
            <CheckCircle size={15} />
            Confirm Receipt
          </Button>
          <Button
            variant="danger"
            onClick={() => { setError(""); setDisputeOpen(true); }}
            className="flex-1"
          >
            <AlertTriangle size={15} />
            Raise Dispute
          </Button>
        </div>

        <p className="text-xs text-text-muted mt-3 text-center">
          Confirming releases funds to the seller. Only confirm if you have
          verified the account works.
        </p>
      </CardContent>

      <Modal
        isOpen={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Raise a Dispute"
      >
        <form onSubmit={submitDispute} className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-neon-red bg-neon-red/10 border border-neon-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Textarea
            label="Describe the issue"
            placeholder="Explain what went wrong in detail (minimum 20 characters)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-text-muted">
            An admin will review your dispute and contact both parties. Please
            provide as much detail as possible.
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setDisputeOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={disputeLoading} className="flex-1">
              Submit Dispute
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
