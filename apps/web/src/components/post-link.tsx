'use client';

import { useCallback, useEffect, useRef, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { PostSummary, ReelItem } from '@agahiram/shared';
import { listPostVideos } from '@agahiram/shared';
import { prefetchPostBundle } from '@/lib/prefetch-post';
import { buildPostPathFromSummary } from '@/lib/post-url';
import { buildReelPathFromSummary, isReelPost } from '@/lib/reel-url';

type PostLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'prefetch'> & {
  postId: string;
  post?: PostSummary & Partial<ReelItem>;
  /** Open in reels viewer (one clip per carousel video). */
  preferReels?: boolean;
};

export function PostLink({
  postId,
  post,
  preferReels = false,
  children,
  onMouseEnter,
  onFocus,
  ...rest
}: PostLinkProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const prefetched = useRef(false);
  const ref = useRef<HTMLAnchorElement>(null);

  const href = post
    ? preferReels || isReelPost(post)
      ? buildReelPathFromSummary(post, {
          mediaId: post.mediaId ?? listPostVideos(post)[0]?.id,
        })
      : post.category?.slug != null
        ? buildPostPathFromSummary(post)
        : `/post/${postId}`
    : `/post/${postId}`;

  const warmCache = useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;
    prefetchPostBundle(qc, postId, post);
    void router.prefetch(href);
  }, [post, postId, qc, router, href]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) warmCache();
      },
      { rootMargin: '200px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [warmCache]);

  return (
    <Link
      ref={ref}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        warmCache();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warmCache();
        onFocus?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
