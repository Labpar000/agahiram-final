import type { PostSummary } from '@agahiram/shared';

const POST_ID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/** Slug segment for URLs: latin digits + hyphen; Persian kept as-is when safe. */
export function slugifyPostTitle(title: string): string {
  const trimmed = title.trim().slice(0, 60);
  const base = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'ad';
}

export function parsePostIdFromSlugParam(slugId: string): string | null {
  let decoded = slugId;
  try {
    decoded = decodeURIComponent(slugId);
  } catch {
    /* keep raw segment */
  }
  const m = decoded.match(POST_ID_RE);
  return m?.[1] ?? null;
}

/** Decode path segments so encoded and decoded ad URLs compare equal. */
export function normalizePostAdPath(path: string): string {
  return path
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      try {
        return decodeURIComponent(seg).normalize('NFC');
      } catch {
        return seg.normalize('NFC');
      }
    })
    .join('/');
}

export function postAdPathsMatch(actualPath: string, expectedPath: string): boolean {
  return normalizePostAdPath(actualPath) === normalizePostAdPath(expectedPath);
}

export type PostUrlInput = {
  id: string;
  title: string;
  category: { slug: string };
  city?: { slug?: string } | null;
};

export function buildPostPath(post: PostUrlInput): string {
  const citySlug = post.city?.slug ?? 'iran';
  const slug = slugifyPostTitle(post.title);
  // Percent-encode the title slug so redirect Location headers stay ASCII-valid.
  const segment = encodeURIComponent(`${slug}-${post.id}`);
  return `/ad/${post.category.slug}/${citySlug}/${segment}`;
}

export function buildPostPathFromSummary(post: PostSummary): string {
  return buildPostPath({
    id: post.id,
    title: post.title,
    category: post.category,
    city: post.city?.slug ? { slug: post.city.slug } : null,
  });
}
