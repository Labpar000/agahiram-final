import { describe, expect, it } from 'vitest';
import type { PublishSticker } from './story-composer';
import { buildStoryPublishRequest, normalizeScheduledAt } from './story-publish-request';

type QueueItem = Parameters<typeof buildStoryPublishRequest>[0][number];

const baseSlide = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  mediaKey: 'media-1',
  mediaType: 'image',
  audience: 'PUBLIC',
  allowReplies: 'EVERYONE',
  stickers: [] as PublishSticker[],
  ...overrides,
});

describe('story publish request mapping', () => {
  it('maps single publish to /stories and preserves scheduledAt', () => {
    const req = buildStoryPublishRequest(
      [baseSlide({ scheduledAt: '2026-06-05T10:30', hashtag: '#rent' })],
      'session-1',
    );

    expect(req.endpoint).toBe('/stories');
    if (req.endpoint !== '/stories') throw new Error('unexpected endpoint');

    expect(req.body.scheduledAt).toBe('2026-06-05T17:30:00.000Z');
    expect(req.body.hashtag).toBe('#rent');
    expect(req.body.sequenceIndex).toBe(0);
    expect(req.body.sessionId).toBe('session-1');
  });

  it('maps batch publish to /stories/batch with session level fields', () => {
    const req = buildStoryPublishRequest(
      [
        baseSlide({
          mediaKey: 'img-1',
          scheduledAt: '2026-06-06T09:00',
          audience: 'CLOSE_FRIENDS',
        }),
        baseSlide({ mediaKey: 'img-2', mediaType: 'video', videoDurationMs: 50_000 }),
      ],
      'session-2',
    );

    expect(req.endpoint).toBe('/stories/batch');
    if (req.endpoint !== '/stories/batch') throw new Error('unexpected endpoint');

    expect(req.body.audience).toBe('CLOSE_FRIENDS');
    expect(req.body.allowReplies).toBe('EVERYONE');
    expect(req.body.scheduledAt).toBe('2026-06-06T16:00:00.000Z');
    expect(req.body.stories).toHaveLength(2);
    expect(req.body.stories[1]?.durationMs).toBe(15_000);
    expect(req.body.stories[1]?.sequenceIndex).toBe(1);
  });

  it('drops invalid scheduledAt values', () => {
    expect(normalizeScheduledAt('bad-date')).toBeUndefined();
  });

  it('throws when queue is empty', () => {
    expect(() => buildStoryPublishRequest([], 'session-3')).toThrow('اسلایدی برای انتشار نیست');
  });
});
