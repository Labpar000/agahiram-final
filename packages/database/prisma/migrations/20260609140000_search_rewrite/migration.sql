-- SearchAlert indexes + dedup table + searchVector trigger includes user display name

CREATE TABLE IF NOT EXISTS "SearchAlertNotification" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchAlertNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SearchAlertNotification_alertId_postId_key"
  ON "SearchAlertNotification"("alertId", "postId");
CREATE INDEX IF NOT EXISTS "SearchAlertNotification_alertId_idx"
  ON "SearchAlertNotification"("alertId");
CREATE INDEX IF NOT EXISTS "SearchAlertNotification_postId_idx"
  ON "SearchAlertNotification"("postId");

ALTER TABLE "SearchAlertNotification"
  ADD CONSTRAINT "SearchAlertNotification_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "SearchAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SearchAlert_userId_isActive_idx"
  ON "SearchAlert"("userId", "isActive");

-- Include seller display name in maintained FTS vector.
CREATE OR REPLACE FUNCTION agahiram_post_search_vector_update()
RETURNS trigger AS $$
DECLARE
  category_name text := '';
  city_name text := '';
  province_name text := '';
  neighborhood_name text := '';
  username text := '';
  user_name text := '';
BEGIN
  SELECT c."name" INTO category_name FROM "Category" c WHERE c."id" = NEW."categoryId";

  IF NEW."cityId" IS NOT NULL THEN
    SELECT ci."name", pr."name"
      INTO city_name, province_name
    FROM "City" ci
    LEFT JOIN "Province" pr ON pr."id" = ci."provinceId"
    WHERE ci."id" = NEW."cityId";
  END IF;

  IF NEW."neighborhoodId" IS NOT NULL THEN
    SELECT nb."name" INTO neighborhood_name FROM "Neighborhood" nb WHERE nb."id" = NEW."neighborhoodId";
  END IF;

  SELECT u."username", u."name" INTO username, user_name FROM "User" u WHERE u."id" = NEW."userId";

  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."description", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(province_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(neighborhood_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(username, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(user_name, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agahiram_post_search_vector_update_trg ON "Post";
CREATE TRIGGER agahiram_post_search_vector_update_trg
BEFORE INSERT OR UPDATE OF "title", "description", "categoryId", "cityId", "neighborhoodId", "userId"
ON "Post"
FOR EACH ROW
EXECUTE FUNCTION agahiram_post_search_vector_update();

UPDATE "Post"
SET "searchVector" =
  setweight(to_tsvector('simple', coalesce("Post"."title", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("Post"."description", '')), 'B') ||
  setweight(
    to_tsvector(
      'simple',
      coalesce((SELECT c."name" FROM "Category" c WHERE c."id" = "Post"."categoryId"), '')
    ),
    'A'
  ) ||
  setweight(
    to_tsvector(
      'simple',
      coalesce(
        (
          SELECT pr."name"
          FROM "City" ci
          LEFT JOIN "Province" pr ON pr."id" = ci."provinceId"
          WHERE ci."id" = "Post"."cityId"
        ),
        ''
      )
    ),
    'B'
  ) ||
  setweight(
    to_tsvector(
      'simple',
      coalesce((SELECT ci."name" FROM "City" ci WHERE ci."id" = "Post"."cityId"), '')
    ),
    'A'
  ) ||
  setweight(
    to_tsvector(
      'simple',
      coalesce((SELECT nb."name" FROM "Neighborhood" nb WHERE nb."id" = "Post"."neighborhoodId"), '')
    ),
    'C'
  ) ||
  setweight(
    to_tsvector(
      'simple',
      coalesce((SELECT u."username" FROM "User" u WHERE u."id" = "Post"."userId"), '')
    ),
    'C'
  ) ||
  setweight(
    to_tsvector(
      'simple',
      coalesce((SELECT u."name" FROM "User" u WHERE u."id" = "Post"."userId"), '')
    ),
    'C'
  );
