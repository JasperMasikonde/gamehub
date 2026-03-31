import { TransactionStatus } from "@prisma/client";
import { Check, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STEPS: { status: TransactionStatus; label: string; description: string }[] = [
  { status: "PENDING_PAYMENT", label: "Payment", description: "Awaiting payment confirmation" },
  { status: "IN_ESCROW", label: "In Escrow", description: "Funds secured, seller delivers account" },
  { status: "DELIVERED", label: "Delivered", description: "Seller delivered credentials" },
  { status: "COMPLETED", label: "Complete", description: "Transaction complete, funds released" },
];

const STATUS_ORDER: Record<TransactionStatus, number> = {
  PENDING_PAYMENT: 0,
  IN_ESCROW: 1,
  DELIVERED: 2,
  COMPLETED: 3,
  DISPUTED: 2.5,
  REFUNDED: 4,
  CANCELLED: -1,
};

export function EscrowTimeline({ status }: { status: TransactionStatus }) {
  const currentStep = STATUS_ORDER[status];

  if (status === "CANCELLED") {
    return (
      <div className="bg-neon-red/10 border border-neon-red/30 rounded-lg px-4 py-3 text-sm text-neon-red flex items-center gap-2">
        <AlertTriangle size={15} />
        This transaction was cancelled
      </div>
    );
  }

  if (status === "DISPUTED") {
    return (
      <div className="bg-neon-red/10 border border-neon-red/30 rounded-lg px-4 py-3 text-sm text-neon-red flex items-center gap-2">
        <AlertTriangle size={15} />
        Dispute raised — awaiting admin review
      </div>
    );
  }

  if (status === "REFUNDED") {
    return (
      <div className="bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg px-4 py-3 text-sm text-neon-yellow flex items-center gap-2">
        <ShieldCheck size={15} />
        Refunded — dispute resolved in buyer&apos;s favor
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const stepOrder = STATUS_ORDER[step.status];
        const done = currentStep > stepOrder;
        const active = Math.floor(currentStep) === stepOrder;

        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                  done
                    ? "bg-neon-green border-neon-green"
                    : active
                    ? "bg-neon-blue/20 border-neon-blue animate-pulse"
                    : "bg-bg-elevated border-bg-border"
                )}
              >
                {done ? (
                  <Check size={14} className="text-bg-primary" />
                ) : active ? (
                  <Clock size={13} className="text-neon-blue" />
                ) : (
                  <span className="text-xs text-text-muted">{i + 1}</span>
                )}
              </div>
              <p
                className={cn(
                  "text-[10px] mt-1 font-medium text-center w-16",
                  done
                    ? "text-neon-green"
                    : active
                    ? "text-neon-blue"
                    : "text-text-muted"
                )}
              >
                {step.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mb-5",
                  done ? "bg-neon-green" : "bg-bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
