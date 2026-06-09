import type { PostSummary, ReelItem } from '@agahiram/shared';
import { buildReelKey, expandPostToReelItems, listPostVideos } from '@agahiram/shared';

export function isImmersiveReelsRoute(pathname: string): boolean {
  return pathname === '/reels' || /^\/reels\/[^/]+$/.test(pathname);
}

export function buildReelPath(
  postId: string,
  opts?: { user?: string | null; mediaId?: string | null },
): string {
  const base = `/reels/${postId}`;
  const params = new URLSearchParams();
  const user = opts?.user?.trim();
  if (user) params.set('user', user);
  if (opts?.mediaId) params.set('media', opts.mediaId);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function buildReelPathFromSummary(
  post: PostSummary,
  opts?: { mediaId?: string | null },
): string {
  const videos = listPostVideos(post);
  const mediaId = opts?.mediaId ?? videos[0]?.id ?? null;
  return buildReelPath(post.id, { user: post.user.username, mediaId });
}

export function toReelItem(post: PostSummary & Partial<ReelItem>): ReelItem | null {
  if (post.reelKey && post.mediaId && post.media.length === 1 && post.media[0]?.type === 'video') {
    const video = post.media[0]!;
    return {
      ...post,
      hlsUrl: post.hlsUrl ?? video.hlsUrl ?? null,
      duration: post.duration ?? video.duration ?? null,
      reelKey: post.reelKey,
      mediaId: post.mediaId,
    };
  }

  const [first] = expandPostToReelItems(post);
  return first ?? null;
}

/** Normalize API/cache payloads — one feed item per video clip, images dropped. */
export function normalizeReelsPage(data: Array<PostSummary & Partial<ReelItem>>): ReelItem[] {
  return data.flatMap((item) => {
    if (
      item.reelKey &&
      item.mediaId &&
      item.media.length === 1 &&
      item.media[0]?.type === 'video'
    ) {
      const normalized = toReelItem(item);
      return normalized ? [normalized] : [];
    }
    return expandPostToReelItems(item);
  });
}

export { expandPostToReelItems, listPostVideos, buildReelKey };

export function isReelPost(post?: Pick<PostSummary, 'type'> | null): boolean {
  return post?.type === 'reel';
}

/** Match a deep-link target against a reels-feed item. */
export function reelMatchesTarget(
  reel: Pick<ReelItem, 'id' | 'reelKey' | 'mediaId'>,
  target?: string | null,
  mediaId?: string | null,
): boolean {
  if (!target) return false;
  if (reel.reelKey === target) return true;
  if (reel.id !== target) return false;
  if (!mediaId) return true;
  return reel.mediaId === mediaId;
}

export function buildReelTargetKey(postId: string, mediaId?: string | null): string {
  return mediaId ? buildReelKey(postId, mediaId) : postId;
}
