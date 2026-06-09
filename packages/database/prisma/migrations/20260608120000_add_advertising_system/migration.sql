-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BidType" AS ENUM ('CPM', 'CPC');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AdSlot" AS ENUM ('STORY', 'EXPLORE_FEED', 'BANNER');

-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('BOTH', 'CALL_ONLY', 'MESSAGE_ONLY');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "deletionReason" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "contactPreference" "ContactPreference" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "PostMedia" ADD COLUMN "isThumbnail" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "budget" BIGINT NOT NULL,
    "dailyBudget" BIGINT,
    "bidType" "BidType" NOT NULL DEFAULT 'CPM',
    "bidAmount" BIGINT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "targeting" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "slot" "AdSlot" NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" BIGINT NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "adminNote" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdImpression" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'explore',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdClick" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPayment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "refId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdCampaign_advertiserId_idx" ON "AdCampaign"("advertiserId");

-- CreateIndex
CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");

-- CreateIndex
CREATE INDEX "Ad_campaignId_idx" ON "Ad"("campaignId");

-- CreateIndex
CREATE INDEX "Ad_status_idx" ON "Ad"("status");

-- CreateIndex
CREATE INDEX "Ad_slot_idx" ON "Ad"("slot");

-- CreateIndex
CREATE INDEX "AdImpression_adId_idx" ON "AdImpression"("adId");

-- CreateIndex
CREATE INDEX "AdImpression_createdAt_idx" ON "AdImpression"("createdAt");

-- CreateIndex
CREATE INDEX "AdClick_adId_idx" ON "AdClick"("adId");

-- CreateIndex
CREATE INDEX "AdClick_createdAt_idx" ON "AdClick"("createdAt");

-- CreateIndex
CREATE INDEX "AdPayment_campaignId_idx" ON "AdPayment"("campaignId");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPayment" ADD CONSTRAINT "AdPayment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
