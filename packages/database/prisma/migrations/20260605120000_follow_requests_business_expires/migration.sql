-- Add missing businessExpiresAt column to User table and create FollowRequest table.
-- These were present in the Prisma schema but lacked a corresponding migration,
-- causing prisma.user.findUnique / user.create to fail with a database error on
-- every OTP verification (column "businessExpiresAt" does not exist).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessExpiresAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "FollowRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FollowRequest_requesterId_targetId_key" ON "FollowRequest"("requesterId", "targetId");
CREATE INDEX IF NOT EXISTS "FollowRequest_targetId_status_idx" ON "FollowRequest"("targetId", "status");

ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
