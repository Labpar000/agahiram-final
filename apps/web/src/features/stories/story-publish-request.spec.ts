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
    const scheduledAt = '2026-06-05T10:30:00.000Z';
    const req = buildStoryPublishRequest(
      [baseSlide({ scheduledAt, hashtag: '#rent' })],
      'session-1',
    );

    expect(req.endpoint).toBe('/stories');
    if (req.endpoint !== '/stories') throw new Error('unexpected endpoint');

    expect(req.body.scheduledAt).toBe(scheduledAt);
    expect(req.body.hashtag).toBe('#rent');
    expect(req.body.sequenceIndex).toBe(0);
    expect(req.body.sessionId).toBe('session-1');
  });

  it('maps batch publish to /stories/batch with session level fields', () => {
    const scheduledAt = '2026-06-06T09:00:00.000Z';
    const req = buildStoryPublishRequest(
      [
        baseSlide({
          mediaKey: 'img-1',
          scheduledAt,
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
    expect(req.body.scheduledAt).toBe(scheduledAt);
    expect(req.body.stories).toHaveLength(2);
    expect(req.body.stories[1]?.durationMs).toBe(15_000);
    expect(req.body.stories[1]?.sequenceIndex).toBe(1);
  });

  it('normalizes datetime-local values using the runtime local timezone', () => {
    const input = '2026-06-05T10:30';
    const normalized = normalizeScheduledAt(input);
    expect(normalized).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const parsed = new Date(normalized!);
    const [datePart, timePart] = input.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    expect(parsed.getFullYear()).toBe(year);
    expect(parsed.getMonth()).toBe(month - 1);
    expect(parsed.getDate()).toBe(day);
    expect(parsed.getHours()).toBe(hours);
    expect(parsed.getMinutes()).toBe(minutes);
  });

  it('drops invalid scheduledAt values', () => {
    expect(normalizeScheduledAt('bad-date')).toBeUndefined();
  });

  it('throws when queue is empty', () => {
    expect(() => buildStoryPublishRequest([], 'session-3')).toThrow('اسلایدی برای انتشار نیست');
  });
});
