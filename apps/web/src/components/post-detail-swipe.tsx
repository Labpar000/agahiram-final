'use client';

import { useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getAdjacentPostsFromCache } from '@/lib/post-feed-navigation';

const SWIPE_MIN_PX = 56;
const SWIPE_MAX_MS = 400;

/** Horizontal swipe between posts from feed cache (C4). */
export function PostDetailSwipe({ postId, children }: { postId: string; children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const navigate = useCallback(
    (dir: 'prev' | 'next') => {
      const { prev, next } = getAdjacentPostsFromCache(qc, postId);
      const target = dir === 'prev' ? prev : next;
      if (target) router.push(`/post/${target.id}`);
    },
    [postId, qc, router],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    if (dt > SWIPE_MAX_MS) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    // RTL: swipe right (positive dx) → older post (prev in list)
    if (dx > 0) navigate('prev');
    else navigate('next');
  };

  return (
    <div className="touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}
