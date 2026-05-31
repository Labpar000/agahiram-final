'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { StoryVideo } from '@/components/story-video';
import { StoryOverlayView, parseStoryOverlay } from '@/components/story-overlay-view';

interface StoryItem {
  id: string;
  mediaUrl: string;
  type: 'image' | 'video';
  durationMs?: number;
  overlayJson?: unknown;
}

export default function HighlightViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const { data: stories, isLoading } = useQuery({
    queryKey: ['highlight-stories', id],
    queryFn: async () => {
      const r = await apiClient.get<StoryItem[]>(`/highlights/${id}/stories`);
      return r.data ?? [];
    },
  });

  const current = stories?.[index];
  const duration = current?.durationMs ?? 5000;

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      if (index < (stories?.length ?? 0) - 1) setIndex(index + 1);
      else router.back();
    }, duration);
    return () => clearTimeout(t);
  }, [current, index, stories?.length, duration, router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black">
        <Spinner size="xl" className="text-white" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
        <button type="button" onClick={() => router.back()} className="text-sm underline">
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onPointerDown={(e) => {
        const x = e.clientX / window.innerWidth;
        if (x > 0.6) {
          if (index < (stories?.length ?? 0) - 1) setIndex(index + 1);
          else router.back();
        } else if (x < 0.4 && index > 0) setIndex(index - 1);
      }}
    >
      <button
        type="button"
        aria-label="بستن"
        onClick={() => router.back()}
        className="absolute end-3 top-[calc(var(--safe-top)+1rem)] z-10 grid size-10 place-items-center rounded-full bg-black/50 text-white"
      >
        <X className="size-5" aria-hidden />
      </button>
      <div className="relative size-full">
        {current.type === 'video' ? (
          <StoryVideo mediaUrl={current.mediaUrl} className="size-full object-cover" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={current.mediaUrl} alt="" className="size-full object-cover" />
        )}
        <StoryOverlayView
          overlay={parseStoryOverlay(current.overlayJson)}
          className="absolute inset-0 size-full"
        />
      </div>
    </div>
  );
}
