import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime, formatCurrency } from "@/lib/utils/format";
import { ShieldCheck, Plus, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
  EXPIRED: "default",
};

export default async function EscrowRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [sent, received] = await Promise.all([
    prisma.escrowRequest.findMany({
      where: { initiatorId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        counterparty: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.escrowRequest.findMany({
      where: { counterpartyId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        initiator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
  ]);

  const pendingReceived = received.filter((r) => r.status === "PENDING").length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-neon-green" />
            Escrow Requests
            {pendingReceived > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-neon-yellow/20 border border-neon-yellow/30 text-neon-yellow text-xs font-bold">
                {pendingReceived} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-text-muted mt-1">Private escrow deals between you and another user</p>
        </div>
        <Link href="/escrow-requests/new">
          <Button variant="primary" size="sm">
            <Plus size={14} /> New Request
          </Button>
        </Link>
      </div>

      {/* Received */}
      {received.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Received
          </h2>
          <div className="flex flex-col gap-2">
            {received.map((req) => (
              <EscrowRequestRow
                key={req.id}
                id={req.id}
                title={req.title}
                price={req.price.toString()}
                currency={req.currency}
                status={req.status}
                role={req.initiatorRole === "BUYER" ? "SELLER" : "BUYER"}
                otherUser={req.initiator}
                createdAt={req.createdAt.toString()}
                transactionId={req.transactionId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sent */}
      {sent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Sent
          </h2>
          <div className="flex flex-col gap-2">
            {sent.map((req) => (
              <EscrowRequestRow
                key={req.id}
                id={req.id}
                title={req.title}
                price={req.price.toString()}
                currency={req.currency}
                status={req.status}
                role={req.initiatorRole}
                otherUser={req.counterparty}
                createdAt={req.createdAt.toString()}
                transactionId={req.transactionId}
              />
            ))}
          </div>
        </section>
      )}

      {sent.length === 0 && received.length === 0 && (
        <div className="text-center py-20 border border-bg-border rounded-xl bg-bg-elevated text-text-muted">
          <ShieldCheck size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No escrow requests yet</p>
          <p className="text-sm mt-1 mb-6">
            Already agreed on a deal? Use GameHub&apos;s escrow to protect both parties.
          </p>
          <Link href="/escrow-requests/new">
            <Button variant="primary" size="sm">
              <Plus size={14} /> Request Escrow
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function EscrowRequestRow({
  id,
  title,
  price,
  currency,
  status,
  role,
  otherUser,
  createdAt,
  transactionId,
}: {
  id: string;
  title: string;
  price: string;
  currency: string;
  status: string;
  role: string;
  otherUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  createdAt: string;
  transactionId: string | null;
}) {
  return (
    <Link
      href={transactionId ? `/dashboard/escrow/${transactionId}` : `/escrow-requests/${id}`}
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-bg-border bg-bg-elevated hover:border-neon-green/20 hover:bg-bg-surface transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-bg-surface border border-bg-border flex items-center justify-center overflow-hidden shrink-0">
        {otherUser.avatarUrl ? (
          <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={16} className="text-text-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-neon-green transition-colors">
          {title}
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          with @{otherUser.username} · You are the{" "}
          <span className={role === "BUYER" ? "text-neon-blue" : "text-neon-green"}>
            {role.toLowerCase()}
          </span>
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-neon-green">
          {formatCurrency(price)}
        </p>
        <p className="text-[10px] text-text-muted">{formatRelativeTime(createdAt)}</p>
      </div>

      <Badge variant={STATUS_VARIANT[status] ?? "default"}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>

      <ArrowRight size={14} className="text-text-muted shrink-0" />
    </Link>
  );
}
