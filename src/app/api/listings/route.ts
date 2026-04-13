import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createListingSchema, listingFilterSchema } from "@/lib/validations/listing";
import { getPublicUrl } from "@/lib/gcs";
import { ListingStatus, Platform } from "@prisma/client";
import { sendAdminNotification } from "@/lib/email";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());
  const filter = listingFilterSchema.parse(params);

  const session = await resolveSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const where = {
    isPrivateDeal: false,
    status: isAdmin
      ? (filter.status as ListingStatus | undefined)
      : ListingStatus.ACTIVE,
    ...(filter.platform ? { platform: filter.platform as Platform } : {}),
    ...(filter.minPrice || filter.maxPrice
      ? {
          price: {
            ...(filter.minPrice ? { gte: filter.minPrice } : {}),
            ...(filter.maxPrice ? { lte: filter.maxPrice } : {}),
          },
        }
      : {}),
    ...(filter.search
      ? {
          OR: [
            { title: { contains: filter.search, mode: "insensitive" as const } },
            { description: { contains: filter.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerifiedSeller: true,
            rating: true,
            role: true,
          },
        },
        screenshots: {
          where: { isCover: true },
          take: 1,
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({ listings, total, page: filter.page, pageSize: filter.pageSize });
}

export async function POST(req: Request) {
  const session = await resolveSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!dbUser?.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before creating a listing." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { imageKeys, ...listingData } = parsed.data;

  const listing = await prisma.listing.create({
    data: {
      ...listingData,
      sellerId: session.user.id,
      status: ListingStatus.PENDING_APPROVAL,
      screenshots: {
        create: imageKeys.map((key, i) => ({
          gcsKey: key,
          url: getPublicUrl(key),
          order: i,
          isCover: i === 0,
        })),
      },
    },
    include: { screenshots: true },
  });

  // Notify admin via email (fire-and-forget)
  prisma.siteConfig.findUnique({ where: { id: "singleton" } }).then((cfg) => {
    if (!cfg?.adminNotificationEmail) return;
    sendAdminNotification({
      toEmail: cfg.adminNotificationEmail,
      subject: "New listing pending approval — Eshabiki",
      eventTitle: "New listing submitted",
      eventBody: `A new listing "${listing.title}" has been submitted and is awaiting approval.`,
      linkUrl: `/admin/listings`,
      linkLabel: "Review listings →",
    }).catch(console.error);
  }).catch(console.error);

  return NextResponse.json({ listing }, { status: 201 });
}
