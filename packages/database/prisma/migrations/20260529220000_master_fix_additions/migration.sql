-- User additions
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "karma" INTEGER NOT NULL DEFAULT 0;

-- Post additions
ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "commentsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Comment additions
ALTER TABLE "Comment"
  ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- PostView table
CREATE TABLE IF NOT EXISTS "PostView" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "viewerHash" TEXT,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PostView_postId_viewedAt_idx" ON "PostView"("postId", "viewedAt");
CREATE INDEX IF NOT EXISTS "PostView_userId_viewedAt_idx" ON "PostView"("userId", "viewedAt");

-- Block table
CREATE TABLE IF NOT EXISTS "Block" (
  "id" TEXT PRIMARY KEY,
  "blockerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "blockedId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Block_blockerId_blockedId_key" UNIQUE ("blockerId", "blockedId")
);
CREATE INDEX IF NOT EXISTS "Block_blockerId_idx" ON "Block"("blockerId");
CREATE INDEX IF NOT EXISTS "Block_blockedId_idx" ON "Block"("blockedId");

-- NotificationPreference
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "likesPush" BOOLEAN NOT NULL DEFAULT true,
  "commentsPush" BOOLEAN NOT NULL DEFAULT true,
  "followsPush" BOOLEAN NOT NULL DEFAULT true,
  "messagesPush" BOOLEAN NOT NULL DEFAULT true,
  "likesEmail" BOOLEAN NOT NULL DEFAULT false,
  "commentsEmail" BOOLEAN NOT NULL DEFAULT false,
  "followsEmail" BOOLEAN NOT NULL DEFAULT false,
  "messagesEmail" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PayoutStatus enum
DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'approved', 'rejected', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payout table
CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "amount" BIGINT NOT NULL,
  "cardNumber" TEXT,
  "iban" TEXT,
  "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
  "rejectReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Payout_userId_status_idx" ON "Payout"("userId", "status");
CREATE INDEX IF NOT EXISTS "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");
