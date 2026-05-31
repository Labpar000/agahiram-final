-- Phases 8-12: publishAt, searchableText for stories

ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "searchableText" TEXT;

CREATE INDEX IF NOT EXISTS "Story_publishAt_idx" ON "Story"("publishAt");
CREATE INDEX IF NOT EXISTS "Story_searchableText_idx" ON "Story"("searchableText");
