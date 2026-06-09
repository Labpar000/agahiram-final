import type { ServedAd } from '@agahiram/shared';
import type { User } from 'react-instagram-stories';

export const SPONSORED_USER_PREFIX = '__sponsored_';

export function isSponsoredUserId(userId: string): boolean {
  return userId.startsWith(SPONSORED_USER_PREFIX);
}

export function sponsoredAdIdFromUserId(userId: string): string | null {
  if (!isSponsoredUserId(userId)) return null;
  return userId.slice(SPONSORED_USER_PREFIX.length);
}

export function injectStoryAds(users: User[], ads: ServedAd[], interval: number): User[] {
  if (!ads.length || interval < 1 || users.length === 0) return users;

  const result: User[] = [];
  let adIdx = 0;

  users.forEach((user, i) => {
    result.push(user);
    if ((i + 1) % interval === 0) {
      const ad = ads[adIdx % ads.length]!;
      adIdx += 1;
      result.push({
        id: `${SPONSORED_USER_PREFIX}${ad.id}`,
        username: 'تبلیغ',
        avatarUrl: ad.mediaUrl,
        hasUnreadStories: true,
        stories: [
          {
            id: ad.id,
            type: 'image',
            src: ad.mediaUrl,
            duration: 5000,
            alt: ad.title ?? 'تبلیغ',
          },
        ],
      });
    }
  });

  return result;
}
