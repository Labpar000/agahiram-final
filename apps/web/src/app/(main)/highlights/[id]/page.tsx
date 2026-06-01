'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { IgClose, Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { StoryVideo } from '@/components/story-video';
import {
  StoryOverlayView,
  getStoryFilterCss,
  parseStoryOverlay,
} from '@/components/story-overlay-view';
import {
  StoryInteractiveStickersView,
  type ApiStorySticker,
} from '@/features/stories/stickers/story-interactive-stickers-view';
import { useStoryPlayback } from '@/hooks/use-story-playback';
import { StoryViewerFrame } from '@/features/stories/story-viewer-frame';
import { StoryViewerTapZones } from '@/features/stories/story-viewer-tap-zones';

interface StoryItem {
  id: string;
  mediaUrl: string;
  hlsUrl?: string | null;
  type: 'image' | 'video';
  durationMs?: number;
  overlayJson?: unknown;
  stickers?: ApiStorySticker[];
}

const STORY_IMAGE_MS = 5_000;

export default function HighlightViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const { data: stories, isLoading } = useQuery({
    queryKey: ['highlight-stories', id],
    queryFn: async () => {
      const r = await apiClient.get<StoryItem[]>(`/highlights/${id}/stories`);
      return r.data ?? [];
    },
  });

  const current = stories?.[index];
  const segmentMs = current?.durationMs ?? STORY_IMAGE_MS;
  const overlay = parseStoryOverlay(current?.overlayJson);
  const filterCss = getStoryFilterCss(overlay);

  const goNext = useCallback(() => {
    if (index < (stories?.length ?? 0) - 1) {
      setIndex((i) => i + 1);
    } else {
      router.back();
    }
  }, [index, stories?.length, router]);

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const { progress: progressWidth, attachVideo } = useStoryPlayback({
    storyId: current?.id,
    mediaType: current?.type,
    durationMs: segmentMs,
    paused,
    onComplete: goNext,
  });

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [id]);

  useEffect(() => {
    if (index >= (stories?.length ?? 0) && (stories?.length ?? 0) > 0) {
      setIndex(stories!.length - 1);
    }
  }, [index, stories?.length]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black">
        <Spinner size="xl" className="text-white" />
      </div>
    );
  }

  if (!current || !stories?.length) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
        <div className="text-center">
          <p className="mb-3 text-sm">هایلایت در دسترس نیست</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  return (
    <StoryViewerFrame
      segmentCount={stories.length}
      activeIndex={index}
      progress={progressWidth}
      onSwipeDown={() => router.back()}
      header={
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="بستن"
            onClick={() => router.back()}
            className="grid size-9 place-items-center rounded-full text-white/90 tap-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IgClose className="size-6" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      }
    >
      <div className="relative size-full overflow-hidden bg-black">
        <div className="relative size-full" style={{ filter: filterCss }}>
          {current.type === 'video' ? (
            <StoryVideo
              mediaUrl={current.mediaUrl}
              hlsUrl={current.hlsUrl}
              playbackId={`highlight-${current.id}`}
              active={!paused}
              autoPlay
              muted
              fit="cover"
              onVideoRef={attachVideo}
            />
          ) : (
            <Image
              src={current.mediaUrl}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 420px"
            />
          )}
          <StoryOverlayView
            overlay={overlay}
            className="pointer-events-none absolute inset-0 size-full"
          />
        </div>

        {(current.stickers?.length ?? 0) > 0 ? (
          <StoryInteractiveStickersView
            storyId={current.id}
            stickers={current.stickers ?? []}
            isOwner={false}
            allowInteraction={false}
          />
        ) : null}

        <StoryViewerTapZones onPrev={goPrev} onNext={goNext} onPauseChange={setPaused} />
      </div>
    </StoryViewerFrame>
  );
}
