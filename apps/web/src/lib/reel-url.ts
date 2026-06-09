import type { PostSummary, ReelItem } from '@agahiram/shared';

export function isImmersiveReelsRoute(pathname: string): boolean {
  return pathname === '/reels' || /^\/reels\/[^/]+$/.test(pathname);
}

export function buildReelPath(postId: string, opts?: { user?: string | null }): string {
  const base = `/reels/${postId}`;
  const user = opts?.user?.trim();
  return user ? `${base}?user=${encodeURIComponent(user)}` : base;
}

export function buildReelPathFromSummary(post: PostSummary): string {
  return buildReelPath(post.id, { user: post.user.username });
}

export function toReelItem(post: PostSummary): ReelItem {
  const cover = post.media[0];
  return {
    ...post,
    hlsUrl: cover?.hlsUrl ?? null,
    duration: (cover as { duration?: number | null } | undefined)?.duration ?? null,
  };
}

export function isReelPost(post?: Pick<PostSummary, 'type'> | null): boolean {
  return post?.type === 'reel';
}
