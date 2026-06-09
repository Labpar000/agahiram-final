import { Prisma } from '@prisma/client';
import { normalizePersianText, type SearchInput } from '@agahiram/shared';

/** Engagement-weighted score for personalized browse ranking. */
export function browseScoreOf(
  post: {
    viewCount?: number | null;
    qualityScore?: number | null;
    categoryId: string;
    createdAt: Date;
    isPromoted: boolean;
    boostExpiresAt: Date | null;
    _count?: { likes?: number; saves?: number; comments?: number };
  },
  now: number,
  affinity: Map<string, number>,
): number {
  const views = Number(post.viewCount ?? 0);
  const likes = Number(post._count?.likes ?? 0);
  const saves = Number(post._count?.saves ?? 0);
  const comments = Number(post._count?.comments ?? 0);
  const base = views * 1 + likes * 3 + saves * 5 + comments * 4;
  const qualityBoost = Number(post.qualityScore ?? 0) * 2;
  const ageMs = Math.max(0, now - new Date(post.createdAt).getTime());
  const recency = Math.exp(-ageMs / (7 * 86400000));
  const aff = affinity.get(post.categoryId) ?? 0;
  const promoted =
    post.isPromoted && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date(now)
      ? 50
      : 0;
  return promoted + qualityBoost + base * (1 + aff) * (0.5 + recency * 0.5);
}

export function buildMeiliSort(input: SearchInput): string[] | undefined {
  switch (input.sortBy) {
    case 'newest':
      return ['createdAt:desc'];
    case 'cheapest':
      return ['price:asc'];
    case 'mostExpensive':
      return ['price:desc'];
    case 'mostViewed':
      return ['viewCount:desc'];
    case 'nearest':
      if (typeof input.lat === 'number' && typeof input.lng === 'number') {
        return [`_geoPoint(${input.lat}, ${input.lng}):asc`];
      }
      return ['createdAt:desc'];
    default:
      return undefined;
  }
}

export function buildMeiliFilters(
  input: SearchInput,
  categoryIds?: string[],
  options?: { textSearch?: boolean },
): string[] {
  const filters: string[] = ['status = "approved"', 'userIsPrivate = false'];

  if (input.onlyVideo) {
    filters.push('hasVideo = true');
  } else if (input.onlyImage) {
    filters.push('hasImage = true');
    filters.push('type = "post"');
  } else if (options?.textSearch) {
    filters.push('(type = "post" OR type = "reel")');
  } else {
    filters.push('(type = "post" OR type = "reel")');
  }

  if (categoryIds?.length) {
    if (categoryIds.length === 1) {
      filters.push(`categoryId = "${categoryIds[0]}"`);
    } else {
      filters.push(`categoryId IN [${categoryIds.map((id) => `"${id}"`).join(', ')}]`);
    }
  }
  if (input.cityId) filters.push(`cityId = "${input.cityId}"`);
  if (input.provinceId) filters.push(`provinceId = "${input.provinceId}"`);
  if (input.neighborhoodId) filters.push(`neighborhoodId = "${input.neighborhoodId}"`);
  if (typeof input.minPrice === 'number') filters.push(`price >= ${input.minPrice}`);
  if (typeof input.maxPrice === 'number') filters.push(`price <= ${input.maxPrice}`);
  if (input.priceType) filters.push(`priceType = "${input.priceType}"`);
  if (input.onlyPromoted) {
    const nowTs = Math.floor(Date.now() / 1000);
    filters.push('isPromoted = true');
    filters.push(`boostExpiresAt >= ${nowTs}`);
  }

  return filters;
}

export function attributeWhere(input: SearchInput): Prisma.PostWhereInput | undefined {
  const attrs = input.attributes;
  if (!attrs || Object.keys(attrs).length === 0) return undefined;
  return {
    AND: Object.entries(attrs).map(([key, value]) => ({
      attributes: {
        some: {
          value,
          attribute: { key },
        },
      },
    })),
  };
}

export function browseVisibilityWhere(viewerId?: string): Prisma.PostWhereInput {
  return viewerId
    ? {
        OR: [
          { user: { isPrivate: false } },
          { userId: viewerId },
          { user: { followers: { some: { followerId: viewerId } } } },
        ],
      }
    : { user: { isPrivate: false } };
}

/** Postgres visibility clause aligned with browseVisibilityWhere. */
export function visibilityFilterSql(viewerId?: string): Prisma.Sql {
  if (!viewerId) {
    return Prisma.sql`AND u."isPrivate" = false`;
  }
  return Prisma.sql`AND (
    u."isPrivate" = false
    OR p."userId" = ${viewerId}
    OR EXISTS (
      SELECT 1 FROM "Follow" f
      WHERE f."followingId" = p."userId" AND f."followerId" = ${viewerId}
    )
  )`;
}

export function attributeFilterSql(attrs?: Record<string, string>): Prisma.Sql {
  if (!attrs || Object.keys(attrs).length === 0) return Prisma.empty;
  const clauses = Object.entries(attrs).map(
    ([key, value]) => Prisma.sql`EXISTS (
      SELECT 1 FROM "PostAttribute" pa
      JOIN "CategoryAttribute" ca ON ca.id = pa."attributeId"
      WHERE pa."postId" = p.id AND ca.key = ${key} AND pa.value = ${value}
    )`,
  );
  return Prisma.sql`AND ${Prisma.join(clauses, ' AND ')}`;
}

export function parseSearchOffset(cursor?: string): number {
  if (!cursor) return 0;
  const n = parseInt(cursor, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function geoDistanceSq(
  lat: number,
  lng: number,
  postLat: number | null | undefined,
  postLng: number | null | undefined,
): number {
  const plat = postLat ?? 0;
  const plng = postLng ?? 0;
  return (plat - lat) * (plat - lat) + (plng - lng) * (plng - lng);
}

/** Token-based query match for search alerts (all words must appear). */
export function alertQueryMatches(haystack: string, alertQuery: string): boolean {
  const normalizedHaystack = normalizePersianText(haystack);
  const normalizedQuery = normalizePersianText(alertQuery).trim();
  if (!normalizedQuery) return true;
  const words = normalizedQuery.split(/\s+/).filter((w) => w.length >= 1);
  if (words.length <= 1) return normalizedHaystack.includes(normalizedQuery);
  return words.every((w) => normalizedHaystack.includes(w));
}

export function postAttributesMatch(
  postAttrs: Array<{ attribute: { key: string }; value: string }>,
  filterAttrs?: Record<string, string>,
): boolean {
  if (!filterAttrs || Object.keys(filterAttrs).length === 0) return true;
  const byKey = new Map(postAttrs.map((a) => [a.attribute.key, a.value]));
  return Object.entries(filterAttrs).every(([key, value]) => byKey.get(key) === value);
}
