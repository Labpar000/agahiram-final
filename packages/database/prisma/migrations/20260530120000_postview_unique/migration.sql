-- Deduplicate existing PostView rows before adding unique indexes
DELETE FROM "PostView" a
USING "PostView" b
WHERE a.id > b.id
  AND a."postId" = b."postId"
  AND a."userId" IS NOT NULL
  AND a."userId" = b."userId";

DELETE FROM "PostView" a
USING "PostView" b
WHERE a.id > b.id
  AND a."postId" = b."postId"
  AND a."viewerHash" IS NOT NULL
  AND a."viewerHash" = b."viewerHash";

CREATE UNIQUE INDEX IF NOT EXISTS "PostView_postId_userId_unique"
  ON "PostView"("postId", "userId")
  WHERE "userId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PostView_postId_viewerHash_unique"
  ON "PostView"("postId", "viewerHash")
  WHERE "viewerHash" IS NOT NULL;
