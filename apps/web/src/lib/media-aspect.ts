import { PostType } from '@agahiram/shared';

/** Instagram feed portrait max (4:5). */
export const FEED_ASPECT_MIN = 4 / 5;

/** Instagram feed landscape max (~1.91:1). */
export const FEED_ASPECT_MAX = 1.91;

/** Story / reel native ratio (9:16). */
export const STORY_ASPECT = 9 / 16;

type FeedMedia = {
  type?: string;
  width?: number | null;
  height?: number | null;
};

function defaultFeedAspect(media: FeedMedia | undefined, postType?: PostType): number {
  if (media?.type === 'video') return FEED_ASPECT_MIN;
  if (postType === PostType.REEL) return FEED_ASPECT_MIN;
  return 1;
}

/** Clamp width/height ratio to IG feed bounds with smart fallbacks. */
export function getFeedMediaAspect(media: FeedMedia | undefined, postType?: PostType): number {
  const raw =
    media?.width && media?.height && media.height > 0
      ? media.width / media.height
      : defaultFeedAspect(media, postType);
  return Math.min(Math.max(raw, FEED_ASPECT_MIN), FEED_ASPECT_MAX);
}

export function aspectRatioStyle(ratio: number): { aspectRatio: string } {
  return { aspectRatio: String(ratio) };
}
