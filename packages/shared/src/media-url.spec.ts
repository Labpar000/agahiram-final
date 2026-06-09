import { describe, expect, it } from 'vitest';
import {
  isPreOptimizedMediaUrl,
  isPublicMediaKey,
  mediaKeyFromUrl,
  pickThumbnailSrc,
  toDirectStorageUrl,
  toServedMediaUrl,
} from './media-url';

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
  it('rewrites public media to direct storage (no API proxy hop)', () => {
    expect(toServedMediaUrl('https://alooche.com/storage/agahiram/posts/uuid/thumb.jpg')).toBe(
      '/storage/agahiram/posts/uuid/thumb.jpg',
    );
    expect(toServedMediaUrl('/api/v1/media/object?key=posts%2Fuid%2Ffile.jpg')).toBe(
      '/storage/agahiram/posts/uid/file.jpg',
    );
  });

  it('keeps private message media on the API proxy', () => {
    expect(toServedMediaUrl('messages/user/uuid.webm')).toBe(
      '/api/v1/media/object?key=messages%2Fuser%2Fuuid.webm',
    );
  });
});

describe('toDirectStorageUrl', () => {
  it('builds a relative storage path', () => {
    expect(toDirectStorageUrl('posts/uuid/thumb.jpg')).toBe(
      '/storage/agahiram/posts/uuid/thumb.jpg',
    );
  });
});

describe('isPublicMediaKey', () => {
  it('classifies folders', () => {
    expect(isPublicMediaKey('posts/x/y.jpg')).toBe(true);
    expect(isPublicMediaKey('messages/x/y.webm')).toBe(false);
  });
});

describe('isPreOptimizedMediaUrl', () => {
  it('detects worker output variants', () => {
    expect(isPreOptimizedMediaUrl('/storage/agahiram/posts/uuid/file_thumb.jpg')).toBe(true);
    expect(isPreOptimizedMediaUrl('/storage/agahiram/posts/uuid/file_opt.jpg')).toBe(true);
    expect(isPreOptimizedMediaUrl('/storage/agahiram/posts/uuid/raw.png')).toBe(false);
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

  it('normalizes thumbnail URLs to direct storage', () => {
    expect(
      pickThumbnailSrc({
        type: 'video',
        url: '/api/v1/media/object?key=posts%2Fuid%2Fclip.mp4',
        thumbnailUrl: 'https://alooche.com/storage/agahiram/posts/uuid/thumb.jpg',
      }),
    ).toBe('/storage/agahiram/posts/uuid/thumb.jpg');
  });
});
