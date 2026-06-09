import { describe, expect, it } from 'vitest';
import { mediaKeyFromUrl, pickThumbnailSrc, toServedMediaUrl } from './media-url';

describe('mediaKeyFromUrl', () => {
  it('parses legacy apex storage URLs regardless of configured public host', () => {
    const url =
      'https://alooche.com/storage/agahiram/posts/26946031-e327-41d7-8022-5e978047852e/d7cee577-0cbb-47e8-8743-b1f0c31998e5_thumb.jpg';
    expect(mediaKeyFromUrl(url)).toBe(
      'posts/26946031-e327-41d7-8022-5e978047852e/d7cee577-0cbb-47e8-8743-b1f0c31998e5_thumb.jpg',
    );
  });

  it('parses relative storage paths', () => {
    expect(mediaKeyFromUrl('/storage/agahiram/posts/uuid/file.jpg')).toBe('posts/uuid/file.jpg');
  });

  it('parses served API URLs', () => {
    expect(mediaKeyFromUrl('/api/v1/media/object?key=posts%2Fuid%2Ffile.jpg')).toBe(
      'posts/uid/file.jpg',
    );
  });

  it('keeps bare object keys', () => {
    expect(mediaKeyFromUrl('posts/uid/file.jpg')).toBe('posts/uid/file.jpg');
  });
});

describe('toServedMediaUrl', () => {
  it('rewrites legacy public URLs to the API proxy', () => {
    expect(toServedMediaUrl('https://alooche.com/storage/agahiram/posts/uuid/thumb.jpg')).toBe(
      '/api/v1/media/object?key=posts%2Fuuid%2Fthumb.jpg',
    );
  });
});

describe('pickThumbnailSrc', () => {
  it('returns null for videos without a thumbnail', () => {
    expect(
      pickThumbnailSrc({
        type: 'video',
        url: '/api/v1/media/object?key=posts%2Fuid%2Fclip.mp4',
        thumbnailUrl: null,
      }),
    ).toBeNull();
  });

  it('normalizes thumbnail URLs', () => {
    expect(
      pickThumbnailSrc({
        type: 'video',
        url: '/api/v1/media/object?key=posts%2Fuid%2Fclip.mp4',
        thumbnailUrl: 'https://alooche.com/storage/agahiram/posts/uuid/thumb.jpg',
      }),
    ).toBe('/api/v1/media/object?key=posts%2Fuuid%2Fthumb.jpg');
  });
});
