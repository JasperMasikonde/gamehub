import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  await prisma.user.update({
    where: { email: "admin@eshabiki.com" },
    data: { isSuperAdmin: true },
  });
  console.log("admin@eshabiki.com is now super admin.");
  await prisma.$disconnect();
}

main().catch(console.error);
