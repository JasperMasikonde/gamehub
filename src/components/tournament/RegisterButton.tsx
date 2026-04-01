"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Loader2, UserPlus, Check } from "lucide-react";
import { PaymentPanel } from "@/components/payments/PaymentPanel";

interface Props {
  slug: string;
  tournamentId: string;
  entryFee: number;
  isRegistered: boolean;
  isOpen: boolean;
  isFull: boolean;
}

export function RegisterButton({ slug, tournamentId, entryFee, isRegistered, isOpen, isFull }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done">(isRegistered ? "done" : "idle");
  const [error, setError] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);
  const router = useRouter();

  async function registerFree() {
    setState("loading"); setError("");
    try {
      const res = await fetch(`/api/tournaments/${slug}/register`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to register"); setState("idle"); return; }
      setState("done"); router.refresh();
    } catch { setError("Network error"); setState("idle"); }
  }

  function handleRegisterClick() {
    if (entryFee > 0) {
      setShowPayModal(true);
    } else {
      registerFree();
    }
  }

  if (state === "done" || isRegistered) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-neon-green text-sm font-semibold">
        <Check size={15} /> Registered
      </div>
    );
  }
  if (!isOpen) return null;
  if (isFull) return <span className="text-sm text-neon-red font-semibold">Tournament Full</span>;

  return (
    <>
      <div>
        <Button variant="primary" onClick={handleRegisterClick} disabled={state === "loading"}>
          {state === "loading" ? <><Loader2 size={15} className="animate-spin" /> Registering…</> : <><UserPlus size={15} /> {entryFee > 0 ? `Register — KES ${entryFee.toLocaleString()}` : "Register"}</>}
        </Button>
        {error && <p className="text-xs text-neon-red mt-1">{error}</p>}
      </div>

      {showPayModal && (
        <Modal isOpen onClose={() => setShowPayModal(false)} title="Pay Entry Fee">
          <PaymentPanel
            purpose="tournament"
            entityId={tournamentId}
            amount={entryFee}
            onSuccess={() => {
              setShowPayModal(false);
              setState("done");
              router.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
