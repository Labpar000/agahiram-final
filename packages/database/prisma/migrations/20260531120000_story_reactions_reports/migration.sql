-- Story overlays, reactions, polymorphic reports
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "overlayJson" JSONB;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;

CREATE TABLE IF NOT EXISTS "StoryReaction" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoryReaction_storyId_userId_emoji_key" ON "StoryReaction"("storyId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "StoryReaction_storyId_idx" ON "StoryReaction"("storyId");

ALTER TABLE "StoryReaction" ADD CONSTRAINT "StoryReaction_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryReaction" ADD CONSTRAINT "StoryReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "storyId" TEXT;

CREATE TYPE "ReportTargetType" AS ENUM ('post', 'story', 'user', 'comment');

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetType" "ReportTargetType";
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetId" TEXT;

UPDATE "Report" SET "targetType" = 'post', "targetId" = "postId" WHERE "postId" IS NOT NULL AND "targetType" IS NULL;

ALTER TABLE "Report" ALTER COLUMN "targetType" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "targetId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");
