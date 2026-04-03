import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const EMAIL = "admin@eshabiki.com";
const NEW_PASSWORD = process.argv[2];

if (!NEW_PASSWORD) {
  console.error("Usage: tsx scripts/change-password.ts <new-password>");
  process.exit(1);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const hash = await bcrypt.hash(NEW_PASSWORD, 12);
  await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash: hash },
  });

  console.log(`Password updated for ${EMAIL}`);
  await prisma.$disconnect();
}

main().catch(console.error);
