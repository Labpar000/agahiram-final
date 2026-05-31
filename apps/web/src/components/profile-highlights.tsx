'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Highlight {
  id: string;
  title: string;
  coverUrl: string | null;
  _count?: { stories: number };
}

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
    <div className="flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-none">
      {isMe ? (
        <>
          <Link
            href="/create/story"
            className="flex shrink-0 flex-col items-center gap-1 tap-none"
            aria-label="افزودن استوری"
          >
            <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-muted-foreground/50">
              <Plus className="size-6 text-muted-foreground" aria-hidden />
            </span>
            <span className="max-w-[4.5rem] truncate text-[11px]">استوری</span>
          </Link>
          <Link
            href="/highlights/create"
            className="flex shrink-0 flex-col items-center gap-1 tap-none"
            aria-label="ساخت هایلایت"
          >
            <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-primary/40">
              <Plus className="size-6 text-primary" aria-hidden />
            </span>
            <span className="max-w-[4.5rem] truncate text-[11px]">هایلایت</span>
          </Link>
        </>
      ) : null}
      {highlights.map((h) => (
        <Link
          key={h.id}
          href={`/highlights/${h.id}`}
          className="flex shrink-0 flex-col items-center gap-1 tap-none"
          onContextMenu={(e) => {
            if (!isMe) return;
            e.preventDefault();
            window.location.href = `/highlights/${h.id}/edit`;
          }}
        >
          <span className="relative size-16 overflow-hidden rounded-full ring-2 ring-border">
            {h.coverUrl ? (
              <Image src={h.coverUrl} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <span className="grid size-full place-items-center bg-muted text-xs">★</span>
            )}
          </span>
          <span className="max-w-[4.5rem] truncate text-[11px]">{h.title}</span>
        </Link>
      ))}
    </div>
  );
}
