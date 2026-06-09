import type { PostSummary, ReelItem } from './types';

/** Stable id for one video slide inside the reels feed (`postId:mediaId`). */
export function buildReelKey(postId: string, mediaId: string): string {
  return `${postId}:${mediaId}`;
}

export function parseReelKey(
  key: string,
): { postId: string; mediaId: string } | { postId: string; mediaId: null; legacy: true } | null {
  if (!key) return null;
  const idx = key.indexOf(':');
  if (idx <= 0) {
    if (idx < 0) return { postId: key, mediaId: null, legacy: true };
    return null;
  }
  const postId = key.slice(0, idx);
  const mediaId = key.slice(idx + 1);
  if (!postId || !mediaId) return null;
  return { postId, mediaId };
}

export function listPostVideos(post: Pick<PostSummary, 'media'>): PostSummary['media'] {
  return [...post.media]
    .filter((m) => m.type === 'video')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function reelItemFromVideo(
  summary: PostSummary,
  video: PostSummary['media'][number],
  duration?: number | null,
): ReelItem {
  const clipDuration =
    duration ??
    (video as PostSummary['media'][number] & { duration?: number | null }).duration ??
    null;
  return {
    ...summary,
    media: [video],
    hlsUrl: video.hlsUrl ?? null,
    duration: clipDuration,
    reelKey: buildReelKey(summary.id, video.id),
    mediaId: video.id,
  };
}

/** Split a post into one reels-feed entry per video slide (images ignored). */
export function expandPostToReelItems(
  summary: PostSummary,
  durations?: Map<string, number | null | undefined>,
): ReelItem[] {
  return listPostVideos(summary).map((video) =>
    reelItemFromVideo(summary, video, durations?.get(video.id)),
  );
}
