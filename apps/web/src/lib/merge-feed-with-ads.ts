import type { ServedAd } from '@agahiram/shared';

export type FeedItem<T> = { type: 'post'; data: T } | { type: 'ad'; data: ServedAd };

export function mergeFeedWithAds<T extends { id: string }>(
  posts: T[],
  ads: ServedAd[],
  interval: number,
): Array<FeedItem<T>> {
  if (!ads.length || interval < 1) return posts.map((p) => ({ type: 'post', data: p }));

  const result: Array<FeedItem<T>> = [];
  let adIdx = 0;

  posts.forEach((post, i) => {
    result.push({ type: 'post', data: post });
    if ((i + 1) % interval === 0) {
      result.push({ type: 'ad', data: ads[adIdx % ads.length]! });
      adIdx += 1;
    }
  });

  return result;
}
