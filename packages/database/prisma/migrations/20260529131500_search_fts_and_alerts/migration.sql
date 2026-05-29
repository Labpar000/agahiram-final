-- Enable trigram ops for fuzzy fallback search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add materialized tsvector column used by fallback FTS query
ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Keep Post.searchVector in sync with listing text + related location/category/user labels.
CREATE OR REPLACE FUNCTION agahiram_post_search_vector_update()
RETURNS trigger AS $$
DECLARE
  category_name text := '';
  city_name text := '';
  province_name text := '';
  neighborhood_name text := '';
  username text := '';
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

  SELECT u."username" INTO username FROM "User" u WHERE u."id" = NEW."userId";

  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."description", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(province_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(neighborhood_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(username, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agahiram_post_search_vector_update_trg ON "Post";
CREATE TRIGGER agahiram_post_search_vector_update_trg
BEFORE INSERT OR UPDATE OF "title", "description", "categoryId", "cityId", "neighborhoodId", "userId"
ON "Post"
FOR EACH ROW
EXECUTE FUNCTION agahiram_post_search_vector_update();

-- Rebuild existing rows once.
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
  )
WHERE "searchVector" IS NULL;

-- FTS + trigram indexes for fallback mode (when Meili is unavailable).
CREATE INDEX IF NOT EXISTS "Post_searchVector_idx" ON "Post" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" ON "Post" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_description_trgm_idx" ON "Post" USING GIN ("description" gin_trgm_ops);
