import { Badge } from "./Badge";
import type { TransactionStatus, ListingStatus, DisputeStatus } from "@prisma/client";

const TRANSACTION_LABELS: Record<TransactionStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "purple" }> = {
  PENDING_PAYMENT: { label: "Pending Payment", variant: "warning" },
  IN_ESCROW: { label: "In Escrow", variant: "info" },
  DELIVERED: { label: "Delivered", variant: "purple" },
  COMPLETED: { label: "Completed", variant: "success" },
  DISPUTED: { label: "Disputed", variant: "danger" },
  REFUNDED: { label: "Refunded", variant: "warning" },
  CANCELLED: { label: "Cancelled", variant: "default" },
};

const LISTING_LABELS: Record<ListingStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "purple" }> = {
  DRAFT: { label: "Draft", variant: "default" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  ACTIVE: { label: "Active", variant: "success" },
  SOLD: { label: "Sold", variant: "info" },
  REMOVED: { label: "Removed", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "default" },
};

const DISPUTE_LABELS: Record<DisputeStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "purple" }> = {
  OPEN: { label: "Open", variant: "danger" },
  UNDER_REVIEW: { label: "Under Review", variant: "warning" },
  RESOLVED_BUYER: { label: "Resolved (Buyer)", variant: "success" },
  RESOLVED_SELLER: { label: "Resolved (Seller)", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
};

export function TransactionStatusPill({ status }: { status: TransactionStatus }) {
  const { label, variant } = TRANSACTION_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ListingStatusPill({ status }: { status: ListingStatus }) {
  const { label, variant } = LISTING_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function DisputeStatusPill({ status }: { status: DisputeStatus }) {
  const { label, variant } = DISPUTE_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
