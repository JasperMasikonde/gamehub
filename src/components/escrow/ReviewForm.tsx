"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ReviewFormProps {
  transactionId: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ transactionId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/transactions/${transactionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to submit review");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    onSubmitted?.();
  };

  if (submitted) {
    return (
      <div className="bg-neon-green/5 border border-neon-green/30 rounded-xl px-4 py-4 text-center">
        <p className="text-sm font-semibold text-neon-green">Review submitted!</p>
        <p className="text-xs text-text-muted mt-1">Thank you for your feedback.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text-primary">Rate this transaction</p>

      {/* Star picker */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none"
          >
            <Star
              size={28}
              className={
                s <= (hovered || rating)
                  ? "text-neon-yellow fill-neon-yellow"
                  : "text-bg-border"
              }
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (optional)…"
        rows={3}
        className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-neon-blue resize-none"
      />

      {error && (
        <p className="text-xs text-neon-red">{error}</p>
      )}

      <Button loading={loading} onClick={handleSubmit} className="self-end">
        Submit Review
      </Button>
    </div>
  );
}
