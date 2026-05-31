'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { IgPlus } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

interface Highlight {
  id: string;
  title: string;
  coverUrl: string | null;
  pinnedOrder?: number | null;
  restricted?: boolean;
  storyCount?: number;
}

/** IG highlight circle ~77px */
const HIGHLIGHT_SIZE = 'size-[4.8125rem]';

export function ProfileHighlights({ username, isMe }: { username: string; isMe: boolean }) {
  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights', username],
    queryFn: async () => {
      const r = await apiClient.get<Highlight[]>(`/users/${username}/highlights`);
      return r.data ?? [];
    },
  });

  if (highlights.length === 0 && !isMe) return null;

  return (
    <div className="flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide">
      {isMe ? (
        <>
          <Link
            href="/create/story"
            className="flex shrink-0 flex-col items-center gap-1.5 tap-none"
            aria-label="افزودن استوری"
          >
            <span
              className={`grid ${HIGHLIGHT_SIZE} place-items-center rounded-full border border-border bg-muted`}
            >
              <IgPlus className="size-6 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="max-w-[4.5rem] truncate text-xs">استوری</span>
          </Link>
          <Link
            href="/profile/archive/stories"
            className="flex shrink-0 flex-col items-center gap-1.5 tap-none"
            aria-label="آرشیو استوری"
          >
            <span
              className={`grid ${HIGHLIGHT_SIZE} place-items-center rounded-full border border-border bg-muted`}
            >
              <span className="text-lg" aria-hidden>
                📁
              </span>
            </span>
            <span className="max-w-[4.5rem] truncate text-xs">آرشیو</span>
          </Link>
          <Link
            href="/highlights/create"
            className="flex shrink-0 flex-col items-center gap-1.5 tap-none"
            aria-label="ساخت هایلایت"
          >
            <span
              className={`grid ${HIGHLIGHT_SIZE} place-items-center rounded-full border border-dashed border-border`}
            >
              <IgPlus className="size-6 text-foreground" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="max-w-[4.5rem] truncate text-xs">هایلایت</span>
          </Link>
        </>
      ) : null}
      {highlights.map((h) => (
        <Link
          key={h.id}
          href={`/highlights/${h.id}`}
          className="flex shrink-0 flex-col items-center gap-1.5 tap-none"
          onContextMenu={(e) => {
            if (!isMe) return;
            e.preventDefault();
            window.location.href = `/highlights/${h.id}/edit`;
          }}
        >
          <span
            className={`relative ${HIGHLIGHT_SIZE} overflow-hidden rounded-full ring-2 ring-border`}
          >
            {h.coverUrl ? (
              <Image src={h.coverUrl} alt="" fill className="object-cover" sizes="77px" />
            ) : h.restricted ? (
              <span className="grid size-full place-items-center bg-muted text-xs text-muted-foreground">
                🔒
              </span>
            ) : (
              <span className="grid size-full place-items-center bg-muted text-xs">★</span>
            )}
            {h.pinnedOrder != null ? (
              <span className="absolute -top-0.5 start-0 rounded-full bg-ig-badge px-1 text-[9px] font-bold text-white">
                📌
              </span>
            ) : null}
          </span>
          <span className="max-w-[4.5rem] truncate text-xs">{h.title}</span>
        </Link>
      ))}
    </div>
  );
}
