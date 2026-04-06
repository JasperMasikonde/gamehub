import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionTransaction } from "@/lib/escrow";
import { encryptCredentials } from "@/lib/crypto";
import { deliverCredentialsSchema } from "@/lib/validations/transaction";
import { TransactionStatus } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (transaction.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (transaction.status !== TransactionStatus.IN_ESCROW) {
    return NextResponse.json(
      { error: "Transaction is not in escrow" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = deliverCredentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { accountEmail, accountPassword, accountUsername, notes, screenshotGcsKeys } = parsed.data;
  const encrypted = encryptCredentials({
    email: accountEmail,
    password: accountPassword,
    ...(accountUsername ? { username: accountUsername } : {}),
    ...(notes ? { notes } : {}),
  });

  // Save screenshots as ListingImage records
  if (screenshotGcsKeys && screenshotGcsKeys.length > 0) {
    const { getPublicUrl } = await import("@/lib/gcs");
    await prisma.listingImage.createMany({
      data: screenshotGcsKeys.map((gcsKey, i) => ({
        listingId: transaction.listingId,
        url: getPublicUrl(gcsKey),
        gcsKey,
        order: i,
        isCover: i === 0,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.transaction.update({
    where: { id },
    data: { encryptedCredentials: encrypted },
  });

  const updated = await transitionTransaction(
    id,
    TransactionStatus.DELIVERED,
    session.user.id
  );

  return NextResponse.json({ transaction: updated });
}
