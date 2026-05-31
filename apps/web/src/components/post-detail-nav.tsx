'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAdjacentPostsFromCache } from '@/lib/post-feed-navigation';

export function PostDetailNav({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const { prev, next } = getAdjacentPostsFromCache(qc, postId);

  if (!prev && !next) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      {prev ? (
        <Link
          href={`/post/${prev.id}`}
          prefetch
          className="inline-flex min-w-0 max-w-[45%] items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground tap-none hover:bg-muted/80"
        >
          <ChevronRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden />
          <span className="truncate">قبلی</span>
        </Link>
      ) : (
        <span className="w-[45%]" />
      )}
      {next ? (
        <Link
          href={`/post/${next.id}`}
          prefetch
          className="inline-flex min-w-0 max-w-[45%] items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground tap-none hover:bg-muted/80"
        >
          <span className="truncate">بعدی</span>
          <ChevronLeft className="size-4 shrink-0 rtl:rotate-180" aria-hidden />
        </Link>
      ) : (
        <span className="w-[45%]" />
      )}
    </div>
  );
}
