import { describe, expect, it } from 'vitest';
import { MediaType, PostStatus, PostType, PriceType } from './types';
import { buildReelKey, expandPostToReelItems, listPostVideos, parseReelKey } from './reel-feed';

const basePost = {
  id: 'post-1',
  title: 'تست',
  description: null,
  price: null,
  priceType: PriceType.NEGOTIABLE,
  status: PostStatus.APPROVED,
  type: PostType.POST,
  isPromoted: false,
  viewCount: 0,
  likesCount: 0,
  commentsCount: 0,
  savesCount: 0,
  sharesCount: 0,
  createdAt: new Date().toISOString(),
  user: {
    id: 'u1',
    username: 'seller',
    name: 'فروشنده',
    avatar: null,
    isVerified: false,
    isBusiness: false,
  },
  category: { id: 'c1', name: 'دسته', slug: 'cat' },
  city: { id: 'city1', name: 'تهران', slug: 'tehran' },
  media: [
    {
      id: 'img-1',
      url: '/storage/agahiram/posts/u1/a.jpg',
      thumbnailUrl: '/storage/agahiram/posts/u1/a.jpg',
      type: MediaType.IMAGE,
      order: 0,
    },
    {
      id: 'vid-1',
      url: '/storage/agahiram/posts/u1/a.mp4',
      thumbnailUrl: null,
      type: MediaType.VIDEO,
      order: 1,
      hlsUrl: '/storage/agahiram/posts/u1/a_hls/index.m3u8',
    },
    {
      id: 'vid-2',
      url: '/storage/agahiram/posts/u1/b.mp4',
      thumbnailUrl: null,
      type: MediaType.VIDEO,
      order: 2,
    },
  ],
};

describe('reel-feed helpers', () => {
  it('buildReelKey and parseReelKey round-trip', () => {
    const key = buildReelKey('post-1', 'vid-1');
    expect(key).toBe('post-1:vid-1');
    expect(parseReelKey(key)).toEqual({ postId: 'post-1', mediaId: 'vid-1' });
  });

  it('parseReelKey treats bare post id as legacy cursor', () => {
    expect(parseReelKey('post-1')).toEqual({
      postId: 'post-1',
      mediaId: null,
      legacy: true,
    });
  });

  it('parseReelKey rejects malformed composite keys', () => {
    expect(parseReelKey('post-1:')).toBeNull();
    expect(parseReelKey(':vid-1')).toBeNull();
  });

  it('listPostVideos ignores images and preserves order', () => {
    const videos = listPostVideos(basePost);
    expect(videos.map((v) => v.id)).toEqual(['vid-1', 'vid-2']);
  });

  it('expandPostToReelItems emits one reel per video clip', () => {
    const items = expandPostToReelItems(basePost);
    expect(items).toHaveLength(2);
    expect(items[0]?.reelKey).toBe('post-1:vid-1');
    expect(items[1]?.reelKey).toBe('post-1:vid-2');
    expect(
      items.every((item) => item.media.length === 1 && item.media[0]?.type === MediaType.VIDEO),
    ).toBe(true);
  });
});
