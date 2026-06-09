-- Ad campaign spend tracking and daily budget
ALTER TABLE "AdCampaign" ADD COLUMN "totalSpent" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN "pauseReason" TEXT;

CREATE TABLE "AdDailySpend" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdDailySpend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdDailySpend_campaignId_date_key" ON "AdDailySpend"("campaignId", "date");
CREATE INDEX "AdDailySpend_campaignId_idx" ON "AdDailySpend"("campaignId");

ALTER TABLE "AdDailySpend" ADD CONSTRAINT "AdDailySpend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdPayment" ADD COLUMN "adId" TEXT;
ALTER TABLE "AdPayment" ALTER COLUMN "status" SET DEFAULT 'DEBITED';
CREATE INDEX "AdPayment_adId_idx" ON "AdPayment"("adId");

ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'ad';
