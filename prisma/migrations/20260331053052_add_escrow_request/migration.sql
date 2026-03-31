-- CreateEnum
CREATE TYPE "EscrowRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EscrowPartyRole" AS ENUM ('BUYER', 'SELLER');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "isPrivateDeal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EscrowRequest" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "initiatorRole" "EscrowPartyRole" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "EscrowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EscrowRequest_transactionId_key" ON "EscrowRequest"("transactionId");

-- CreateIndex
CREATE INDEX "EscrowRequest_initiatorId_idx" ON "EscrowRequest"("initiatorId");

-- CreateIndex
CREATE INDEX "EscrowRequest_counterpartyId_idx" ON "EscrowRequest"("counterpartyId");

-- CreateIndex
CREATE INDEX "EscrowRequest_status_idx" ON "EscrowRequest"("status");

-- AddForeignKey
ALTER TABLE "EscrowRequest" ADD CONSTRAINT "EscrowRequest_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowRequest" ADD CONSTRAINT "EscrowRequest_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
