import { MAX_STORY_DURATION } from '@agahiram/shared';
import type { StoryOverlayDocument } from '@agahiram/shared';
import type { PublishSticker } from './story-composer';

type StoryPublishQueueItem = {
  mediaKey: string;
  mediaType: 'image' | 'video';
  videoDurationMs?: number;
  overlay?: StoryOverlayDocument;
  audience: 'PUBLIC' | 'CLOSE_FRIENDS';
  allowReplies: string;
  linkedPostId?: string;
  hashtag?: string;
  cityId?: string;
  stickers: PublishSticker[];
  altText?: string;
  scheduledAt?: string;
  repost?: { type: 'post' | 'story'; id: string };
};

type StoryPublishSingleBody = {
  mediaKey: string;
  type: 'image' | 'video';
  overlayJson?: StoryOverlayDocument;
  durationMs?: number;
  audience: 'PUBLIC' | 'CLOSE_FRIENDS';
  allowReplies: string;
  linkedPostId?: string;
  hashtag?: string;
  cityId?: string;
  stickers: PublishSticker[];
  altText?: string;
  repost?: { type: 'post' | 'story'; id: string };
  sequenceIndex: number;
  sessionId: string;
  scheduledAt?: string;
};

type StoryPublishBatchBody = {
  sessionId: string;
  audience: 'PUBLIC' | 'CLOSE_FRIENDS';
  allowReplies: string;
  scheduledAt?: string;
  stories: Array<Omit<StoryPublishSingleBody, 'scheduledAt'>>;
};

export function normalizeScheduledAt(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function buildStoryPublishRequest(
  queue: StoryPublishQueueItem[],
  sessionId: string,
):
  | { endpoint: '/stories'; body: StoryPublishSingleBody }
  | { endpoint: '/stories/batch'; body: StoryPublishBatchBody } {
  if (queue.length === 0) throw new Error('اسلایدی برای انتشار نیست');
  const scheduledAt = normalizeScheduledAt(queue[0]?.scheduledAt);
  const stories = queue.map((slide, index) => ({
    mediaKey: slide.mediaKey,
    type: slide.mediaType,
    overlayJson: slide.overlay,
    durationMs:
      slide.mediaType === 'video' && slide.videoDurationMs
        ? Math.max(1000, Math.min(slide.videoDurationMs, MAX_STORY_DURATION * 1000))
        : undefined,
    audience: slide.audience,
    allowReplies: slide.allowReplies,
    linkedPostId: slide.linkedPostId,
    hashtag: slide.hashtag,
    cityId: slide.cityId,
    stickers: slide.stickers,
    altText: slide.altText,
    repost: slide.repost,
    sequenceIndex: index,
    sessionId,
  }));

  if (stories.length === 1) {
    return {
      endpoint: '/stories',
      body: {
        ...stories[0],
        ...(scheduledAt ? { scheduledAt } : {}),
      },
    };
  }

  return {
    endpoint: '/stories/batch',
    body: {
      sessionId,
      audience: queue[0]!.audience,
      allowReplies: queue[0]!.allowReplies,
      ...(scheduledAt ? { scheduledAt } : {}),
      stories,
    },
  };
}
