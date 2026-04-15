/**
 * Demo seed — creates camera-ready player accounts and challenges
 * for screen recording / promotional videos.
 *
 * All challenges are tagged adminNote: "DEMO_SEED" so they can be
 * bulk-deleted from the admin Settings tab without touching real data.
 *
 * Run: npm run db:seed-demo
 */

import { PrismaClient, ChallengeFormat, ChallengeStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Placeholder squad screenshot — public eFootball promo image used for demo only
const SQUAD_URL =
  "https://storage.googleapis.com/eshabiki-public/demo/squad-placeholder.jpg";

const DEMO_TAG = "DEMO_SEED";

async function main() {
  console.log("Seeding demo data…");

  const hash = async (p: string) => bcrypt.hash(p, 10);

  // ── Demo player accounts ──────────────────────────────────────────────────
  const players = await Promise.all([
    prisma.user.upsert({
      where: { email: "kiingo@demo.eshabiki.com" },
      update: {},
      create: {
        email: "kiingo@demo.eshabiki.com",
        username: "KiingoFC",
        displayName: "Kiingo FC",
        passwordHash: await hash("demo1234!"),
        role: "BUYER",
        status: "ACTIVE",
      },
    }),
    prisma.user.upsert({
      where: { email: "madridmaster@demo.eshabiki.com" },
      update: {},
      create: {
        email: "madridmaster@demo.eshabiki.com",
        username: "MadridMaster",
        displayName: "Madrid Master",
        passwordHash: await hash("demo1234!"),
        role: "BUYER",
        status: "ACTIVE",
      },
    }),
    prisma.user.upsert({
      where: { email: "barcaking@demo.eshabiki.com" },
      update: {},
      create: {
        email: "barcaking@demo.eshabiki.com",
        username: "BarcaKing",
        displayName: "Barca King",
        passwordHash: await hash("demo1234!"),
        role: "BUYER",
        status: "ACTIVE",
      },
    }),
    prisma.user.upsert({
      where: { email: "snipershot@demo.eshabiki.com" },
      update: {},
      create: {
        email: "snipershot@demo.eshabiki.com",
        username: "SniperShot",
        displayName: "Sniper Shot",
        passwordHash: await hash("demo1234!"),
        role: "BUYER",
        status: "ACTIVE",
      },
    }),
  ]);

  const [kiingo, madrid, barca, sniper] = players;
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // ── Demo challenges ───────────────────────────────────────────────────────

  // 1. OPEN — waiting for a challenger (this is the one the "user" will join in the video)
  await prisma.challenge.upsert({
    where: { id: "demo-challenge-open-001" },
    update: {},
    create: {
      id: "demo-challenge-open-001",
      hostId: kiingo.id,
      format: ChallengeFormat.BEST_OF_3,
      wagerAmount: 200,
      status: ChallengeStatus.OPEN,
      hostSquadUrl: SQUAD_URL,
      expiresAt: future,
      adminNote: DEMO_TAG,
    },
  });

  // 2. ACTIVE — both players in, match underway
  await prisma.challenge.upsert({
    where: { id: "demo-challenge-active-001" },
    update: {},
    create: {
      id: "demo-challenge-active-001",
      hostId: madrid.id,
      challengerId: barca.id,
      format: ChallengeFormat.BEST_OF_5,
      wagerAmount: 500,
      status: ChallengeStatus.ACTIVE,
      hostSquadUrl: SQUAD_URL,
      challengerSquadUrl: SQUAD_URL,
      expiresAt: future,
      adminNote: DEMO_TAG,
    },
  });

  // 3. ACTIVE — another live match (makes the listing page look busy)
  await prisma.challenge.upsert({
    where: { id: "demo-challenge-active-002" },
    update: {},
    create: {
      id: "demo-challenge-active-002",
      hostId: sniper.id,
      challengerId: kiingo.id,
      format: ChallengeFormat.BEST_OF_3,
      wagerAmount: 300,
      status: ChallengeStatus.ACTIVE,
      hostSquadUrl: SQUAD_URL,
      challengerSquadUrl: SQUAD_URL,
      expiresAt: future,
      adminNote: DEMO_TAG,
    },
  });

  // 4. OPEN — another open challenge to fill the board
  await prisma.challenge.upsert({
    where: { id: "demo-challenge-open-002" },
    update: {},
    create: {
      id: "demo-challenge-open-002",
      hostId: barca.id,
      format: ChallengeFormat.BEST_OF_3,
      wagerAmount: 150,
      status: ChallengeStatus.OPEN,
      hostSquadUrl: SQUAD_URL,
      expiresAt: future,
      adminNote: DEMO_TAG,
    },
  });

  console.log("Demo seed complete!");
  console.log("Demo accounts (password: demo1234!):");
  console.log("  kiingo@demo.eshabiki.com   → KiingoFC");
  console.log("  madridmaster@demo.eshabiki.com → MadridMaster");
  console.log("  barcaking@demo.eshabiki.com → BarcaKing");
  console.log("  snipershot@demo.eshabiki.com → SniperShot");
  console.log("");
  console.log("To delete all demo challenges, use the admin panel:");
  console.log("  Admin → Challenges → Settings → Delete Demo Challenges");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
