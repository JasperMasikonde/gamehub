-- CreateEnum
CREATE TYPE "ChallengeFormat" AS ENUM ('BEST_OF_3', 'BEST_OF_5');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('OPEN', 'ACTIVE', 'SUBMITTED', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('HOST_WIN', 'CHALLENGER_WIN');

-- AlterTable
ALTER TABLE "EscrowRequest" ADD COLUMN     "sellerScreenshots" TEXT[],
ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET DEFAULT 'KES';

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "challengerId" TEXT,
    "format" "ChallengeFormat" NOT NULL,
    "wagerAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" "ChallengeStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "hostSquadUrl" TEXT NOT NULL,
    "challengerSquadUrl" TEXT,
    "hostResult" "MatchResult",
    "challengerResult" "MatchResult",
    "winnerId" TEXT,
    "adminNote" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeMessage" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_hostId_idx" ON "Challenge"("hostId");

-- CreateIndex
CREATE INDEX "Challenge_challengerId_idx" ON "Challenge"("challengerId");

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "Challenge_createdAt_idx" ON "Challenge"("createdAt");

-- CreateIndex
CREATE INDEX "ChallengeMessage_challengeId_createdAt_idx" ON "ChallengeMessage"("challengeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMessage" ADD CONSTRAINT "ChallengeMessage_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMessage" ADD CONSTRAINT "ChallengeMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
