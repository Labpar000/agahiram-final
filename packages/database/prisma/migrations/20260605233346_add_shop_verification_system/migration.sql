-- CreateEnum
CREATE TYPE "ShopType" AS ENUM ('PERSONAL', 'ONLINE_STORE', 'PHYSICAL_STORE', 'BRAND');

-- CreateEnum
CREATE TYPE "TrustTier" AS ENUM ('UNVERIFIED', 'BASIC', 'STANDARD', 'VERIFIED', 'TRUSTED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('PHONE', 'NATIONAL_ID', 'BUSINESS_LICENSE', 'COMPANY_REG', 'ENAMAD', 'ADDRESS', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('PHONE_VERIFIED', 'IDENTITY_VERIFIED', 'BUSINESS_VERIFIED', 'ENAMAD_HOLDER', 'TOP_SELLER', 'FAST_RESPONDER', 'TRUSTED_SHOP');

-- DropForeignKey
ALTER TABLE "Block" DROP CONSTRAINT "Block_blockedId_fkey";

-- DropForeignKey
ALTER TABLE "Block" DROP CONSTRAINT "Block_blockerId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_userId_fkey";

-- DropForeignKey
ALTER TABLE "PostView" DROP CONSTRAINT "PostView_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostView" DROP CONSTRAINT "PostView_userId_fkey";

-- DropIndex
DROP INDEX "HighlightStory_highlightId_storyId_key";

-- DropIndex
DROP INDEX "Post_description_trgm_idx";

-- DropIndex
DROP INDEX "Post_title_trgm_idx";

-- AlterTable
ALTER TABLE "NotificationPreference" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopType" "ShopType" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "category" TEXT,
    "website" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "cityId" TEXT,
    "workingHours" JSONB,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "trustTier" "TrustTier" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documents" TEXT[],
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "scoreGranted" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopBadge" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_userId_key" ON "Shop"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_slug_idx" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_userId_idx" ON "Shop"("userId");

-- CreateIndex
CREATE INDEX "Shop_trustTier_idx" ON "Shop"("trustTier");

-- CreateIndex
CREATE INDEX "VerificationRequest_shopId_idx" ON "VerificationRequest"("shopId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_type_status_idx" ON "VerificationRequest"("type", "status");

-- CreateIndex
CREATE INDEX "ShopBadge_shopId_idx" ON "ShopBadge"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopBadge_shopId_type_key" ON "ShopBadge"("shopId", "type");

-- CreateIndex
CREATE INDEX "HighlightStory_highlightId_order_idx" ON "HighlightStory"("highlightId", "order");

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopBadge" ADD CONSTRAINT "ShopBadge_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
