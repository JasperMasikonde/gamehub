import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await prisma.rankPushListing.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerifiedSeller: true,
          rating: true,
        },
      },
      category: { select: { id: true, name: true } },
      _count: {
        select: { orders: { where: { status: "COMPLETED" } } },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ listing });
}
