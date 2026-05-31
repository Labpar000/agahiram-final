-- Story parity migration (archive, privacy, stickers, navigation)

CREATE TYPE "StoryAudience" AS ENUM ('PUBLIC', 'CLOSE_FRIENDS');
CREATE TYPE "StoryAllowReplies" AS ENUM ('EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF');
CREATE TYPE "StoryNavigationType" AS ENUM ('FORWARD', 'BACK', 'EXIT', 'NEXT_ACCOUNT');
CREATE TYPE "StoryStickerType" AS ENUM (
  'POLL', 'QUIZ', 'QUESTION', 'SLIDER', 'COUNTDOWN', 'LINK', 'MENTION',
  'HASHTAG', 'LOCATION', 'NOTIFY', 'PRODUCT', 'GIF', 'TIME', 'DATE', 'WEATHER'
);
CREATE TYPE "StoryArchiveAudience" AS ENUM ('PUBLIC', 'CLOSE_FRIENDS');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storyArchiveEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultStoryAllowReplies" "StoryAllowReplies" NOT NULL DEFAULT 'EVERYONE';

CREATE TABLE "StoryPublishSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryPublishSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoryPublishSession_userId_scheduledAt_idx" ON "StoryPublishSession"("userId", "scheduledAt");
ALTER TABLE "StoryPublishSession" ADD CONSTRAINT "StoryPublishSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "mediaKey" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "audience" "StoryAudience" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "allowReplies" "StoryAllowReplies" NOT NULL DEFAULT 'EVERYONE';
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "sequenceIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "altText" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "hashtag" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "cityId" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "hlsUrl" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

CREATE INDEX IF NOT EXISTS "Story_sessionId_idx" ON "Story"("sessionId");
CREATE INDEX IF NOT EXISTS "Story_hashtag_idx" ON "Story"("hashtag");
CREATE INDEX IF NOT EXISTS "Story_cityId_idx" ON "Story"("cityId");

ALTER TABLE "Story" ADD CONSTRAINT "Story_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StoryPublishSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StoryArchive" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "mediaKey" TEXT,
  "type" "MediaType" NOT NULL,
  "overlayJson" JSONB,
  "durationMs" INTEGER,
  "linkedPostId" TEXT,
  "originalStoryId" TEXT,
  "sourceAudience" "StoryArchiveAudience" NOT NULL DEFAULT 'PUBLIC',
  "altText" TEXT,
  "hashtag" TEXT,
  "cityId" TEXT,
  "hlsUrl" TEXT,
  "thumbnailUrl" TEXT,
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoryArchive_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoryArchive_userId_archivedAt_idx" ON "StoryArchive"("userId", "archivedAt");
CREATE INDEX "StoryArchive_hashtag_idx" ON "StoryArchive"("hashtag");
ALTER TABLE "StoryArchive" ADD CONSTRAINT "StoryArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryView" ADD COLUMN IF NOT EXISTS "replayCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "StoryNavigationEvent" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "StoryNavigationType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryNavigationEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoryNavigationEvent_storyId_type_idx" ON "StoryNavigationEvent"("storyId", "type");
CREATE INDEX "StoryNavigationEvent_userId_storyId_idx" ON "StoryNavigationEvent"("userId", "storyId");
ALTER TABLE "StoryNavigationEvent" ADD CONSTRAINT "StoryNavigationEvent_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryNavigationEvent" ADD CONSTRAINT "StoryNavigationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StorySticker" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "type" "StoryStickerType" NOT NULL,
  "payload" JSONB NOT NULL,
  "x" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "y" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorySticker_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StorySticker_storyId_idx" ON "StorySticker"("storyId");
ALTER TABLE "StorySticker" ADD CONSTRAINT "StorySticker_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StoryStickerResponse" (
  "id" TEXT NOT NULL,
  "stickerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryStickerResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoryStickerResponse_stickerId_idx" ON "StoryStickerResponse"("stickerId");
CREATE UNIQUE INDEX "StoryStickerResponse_stickerId_userId_key" ON "StoryStickerResponse"("stickerId", "userId");
CREATE INDEX "StoryStickerResponse_userId_idx" ON "StoryStickerResponse"("userId");
ALTER TABLE "StoryStickerResponse" ADD CONSTRAINT "StoryStickerResponse_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "StorySticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryStickerResponse" ADD CONSTRAINT "StoryStickerResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StoryComment" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoryComment_storyId_createdAt_idx" ON "StoryComment"("storyId", "createdAt");
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CloseFriend" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "friendId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CloseFriend_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CloseFriend_userId_friendId_key" ON "CloseFriend"("userId", "friendId");
CREATE INDEX "CloseFriend_userId_idx" ON "CloseFriend"("userId");
ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StoryHiddenFrom" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hiddenUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryHiddenFrom_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoryHiddenFrom_userId_hiddenUserId_key" ON "StoryHiddenFrom"("userId", "hiddenUserId");
ALTER TABLE "StoryHiddenFrom" ADD CONSTRAINT "StoryHiddenFrom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryHiddenFrom" ADD CONSTRAINT "StoryHiddenFrom_hiddenUserId_fkey" FOREIGN KEY ("hiddenUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StoryMute" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mutedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryMute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoryMute_userId_mutedUserId_key" ON "StoryMute"("userId", "mutedUserId");
ALTER TABLE "StoryMute" ADD CONSTRAINT "StoryMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryMute" ADD CONSTRAINT "StoryMute_mutedUserId_fkey" FOREIGN KEY ("mutedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StoryNotifySubscription" (
  "id" TEXT NOT NULL,
  "subscriberId" TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryNotifySubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoryNotifySubscription_subscriberId_providerUserId_key" ON "StoryNotifySubscription"("subscriberId", "providerUserId");
ALTER TABLE "StoryNotifySubscription" ADD CONSTRAINT "StoryNotifySubscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryNotifySubscription" ADD CONSTRAINT "StoryNotifySubscription_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StoryLinkClick" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "userId" TEXT,
  "stickerId" TEXT,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryLinkClick_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoryLinkClick_storyId_idx" ON "StoryLinkClick"("storyId");

CREATE TABLE "StoryMusic" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "trackId" TEXT NOT NULL,
  "startMs" INTEGER NOT NULL DEFAULT 0,
  "displayMode" TEXT NOT NULL DEFAULT 'minimal',
  CONSTRAINT "StoryMusic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoryMusic_storyId_key" ON "StoryMusic"("storyId");
CREATE INDEX "StoryMusic_trackId_idx" ON "StoryMusic"("trackId");
ALTER TABLE "StoryMusic" ADD CONSTRAINT "StoryMusic_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Highlight" ADD COLUMN IF NOT EXISTS "pinnedOrder" INTEGER;
CREATE INDEX IF NOT EXISTS "Highlight_userId_pinnedOrder_idx" ON "Highlight"("userId", "pinnedOrder");

ALTER TABLE "HighlightStory" ADD COLUMN IF NOT EXISTS "storyArchiveId" TEXT;
ALTER TABLE "HighlightStory" ALTER COLUMN "storyId" DROP NOT NULL;

ALTER TABLE "HighlightStory" ADD CONSTRAINT "HighlightStory_storyArchiveId_fkey" FOREIGN KEY ("storyArchiveId") REFERENCES "StoryArchive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HighlightStory" DROP CONSTRAINT IF EXISTS "HighlightStory_storyId_fkey";
ALTER TABLE "HighlightStory" ADD CONSTRAINT "HighlightStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill archives for highlight-linked live stories
INSERT INTO "StoryArchive" (
  "id", "userId", "mediaUrl", "mediaKey", "type", "overlayJson", "durationMs",
  "linkedPostId", "originalStoryId", "sourceAudience", "archivedAt", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  s."userId",
  s."mediaUrl",
  s."mediaKey",
  s."type",
  s."overlayJson",
  s."durationMs",
  s."linkedPostId",
  s."id",
  'PUBLIC',
  NOW(),
  s."createdAt"
FROM "HighlightStory" hs
JOIN "Story" s ON s."id" = hs."storyId"
WHERE hs."storyArchiveId" IS NULL AND hs."storyId" IS NOT NULL;

UPDATE "HighlightStory" hs
SET "storyArchiveId" = sa."id"
FROM "StoryArchive" sa
WHERE sa."originalStoryId" = hs."storyId" AND hs."storyArchiveId" IS NULL;
