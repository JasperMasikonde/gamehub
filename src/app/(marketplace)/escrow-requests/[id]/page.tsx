import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EscrowRequestDetail } from "@/components/escrow/EscrowRequestDetail";
import { RealtimeRefresh } from "@/components/escrow/RealtimeRefresh";

export default async function EscrowRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const escrowRequest = await prisma.escrowRequest.findUnique({
    where: { id },
    include: {
      initiator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      counterparty: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  if (!escrowRequest) notFound();

  const isParty =
    escrowRequest.initiatorId === session.user.id ||
    escrowRequest.counterpartyId === session.user.id ||
    session.user.role === "ADMIN";

  if (!isParty) redirect("/dashboard");

  // Serialize Prisma types (Decimal, Date) before passing to Client Component
  const serialized = {
    ...escrowRequest,
    price: escrowRequest.price.toString(),
    createdAt: escrowRequest.createdAt.toISOString(),
    updatedAt: escrowRequest.updatedAt.toISOString(),
    expiresAt: escrowRequest.expiresAt?.toISOString() ?? null,
    sellerScreenshots: escrowRequest.sellerScreenshots ?? [],
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <RealtimeRefresh events={["escrow_request_update"]} />
      <EscrowRequestDetail
        escrowRequest={serialized}
        myId={session.user.id}
      />
    </div>
  );
}
