import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptCredentials } from "@/lib/crypto";

export async function GET(
  _req: Request,
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

  if (transaction.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedStatuses = ["DELIVERED", "COMPLETED", "DISPUTED"];
  if (!allowedStatuses.includes(transaction.status)) {
    return NextResponse.json(
      { error: "Credentials not yet available" },
      { status: 400 }
    );
  }

  if (!transaction.encryptedCredentials) {
    return NextResponse.json(
      { error: "No credentials on file" },
      { status: 404 }
    );
  }

  const credentials = decryptCredentials(transaction.encryptedCredentials);
  return NextResponse.json({ credentials });
}
