import { PrismaClient, Platform } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Site config
  await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", updatedAt: new Date() },
    update: {},
  });

  // Admin user
  const adminHash = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gamehub.com" },
    update: {},
    create: {
      email: "admin@gamehub.com",
      username: "admin",
      displayName: "GameHub Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  // Seller
  const sellerHash = await bcrypt.hash("seller123!", 12);
  const seller = await prisma.user.upsert({
    where: { email: "seller@gamehub.com" },
    update: {},
    create: {
      email: "seller@gamehub.com",
      username: "ProSeller",
      displayName: "Pro Seller",
      passwordHash: sellerHash,
      role: "SELLER",
      isVerifiedSeller: true,
      totalSales: 12,
      rating: 4.8,
    },
  });

  // Buyer
  const buyerHash = await bcrypt.hash("buyer123!", 12);
  await prisma.user.upsert({
    where: { email: "buyer@gamehub.com" },
    update: {},
    create: {
      email: "buyer@gamehub.com",
      username: "GameBuyer",
      displayName: "Game Buyer",
      passwordHash: buyerHash,
      role: "BUYER",
    },
  });

  // Sample listings
  const sampleListings = [
    {
      title: "PS5 eFootball Account – 99 Messi, Division 1, 500K Coins",
      description:
        "Top-tier eFootball account with absolute legends. Division 1 ranked, full squad of 99-rated players. Clean account, no bans, original email included. Perfect for competitive play.",
      price: 199.99,
      platform: Platform.PS5,
      region: "Global",
      division: "Division 1",
      accountLevel: 99,
      coins: 500000,
      gpAmount: 5000000,
      featuredPlayers: ["Messi", "Ronaldo", "Mbappe", "Haaland", "Neymar"],
      overallRating: 99,
    },
    {
      title: "Mobile eFootball Account – Top 100 Global, 2M GP",
      description:
        "Rare mobile account ranked Top 100 globally. Massive GP balance, stacked squad with top performers. Transferable with full account access provided securely.",
      price: 149.99,
      platform: Platform.MOBILE,
      region: "Global",
      division: "Top 100",
      accountLevel: 87,
      coins: 100000,
      gpAmount: 2000000,
      featuredPlayers: ["Bellingham", "Mbappe", "Vinicius", "Pedri"],
      overallRating: 97,
    },
    {
      title: "PC eFootball Starter Account – Good Squad, Easy Grind",
      description:
        "Solid starter account for anyone looking to jump into competitive eFootball without grinding from scratch. Decent squad with meta players.",
      price: 29.99,
      platform: Platform.PC,
      region: "Europe",
      division: "Division 3",
      accountLevel: 45,
      coins: 20000,
      gpAmount: 300000,
      featuredPlayers: ["Lewandowski", "Salah", "De Bruyne"],
      overallRating: 90,
    },
  ];

  for (const data of sampleListings) {
    const existing = await prisma.listing.findFirst({
      where: { title: data.title, sellerId: seller.id },
    });
    if (!existing) {
      await prisma.listing.create({
        data: {
          ...data,
          sellerId: seller.id,
          status: "ACTIVE",
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      });
    }
  }

  console.log("Seed complete!");
  console.log("Admin:  admin@gamehub.com / admin123!");
  console.log("Seller: seller@gamehub.com / seller123!");
  console.log("Buyer:  buyer@gamehub.com / buyer123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
