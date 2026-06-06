'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IgPlay, IgVolume } from '@agahiram/ui';
import { useManagedVideo } from '@/hooks/use-managed-video';
import { observeFeedVideo } from '@/lib/video-playback';
import { MediaVideoFrame } from '@/components/media-video-frame';

type Props = {
  id: string;
  hlsUrl?: string | null;
  mp4Url?: string;
  poster?: string;
  className?: string;
  active?: boolean;
  /** Fired on double-tap (e.g. like burst on post card). */
  onDoubleTap?: () => void;
};

/** IG-style feed video: muted autoplay in viewport, tap to pause/play. */
export function FeedPostVideo({
  id,
  hlsUrl,
  mp4Url,
  poster,
  className,
  active = true,
  onDoubleTap,
}: Props) {
  const videoId = `feed-${id}`;
  const lastTapRef = useRef(0);
  const [muted, setMuted] = useState(true);
  const [inView, setInView] = useState(false);
  const { videoRef, containerRef, playing, togglePlay } = useManagedVideo({
    id: videoId,
    kind: 'feed',
    hlsUrl,
    mp4Url,
    active: active && inView,
    loop: true,
    muted,
    autoplayWhenActive: true,
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    return observeFeedVideo(node, setInView);
  }, [containerRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted, videoRef]);

  const onTap = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const now = Date.now();
      if (onDoubleTap && now - lastTapRef.current < 300) {
        lastTapRef.current = 0;
        onDoubleTap();
        return;
      }
      lastTapRef.current = now;
      togglePlay();
    },
    [onDoubleTap, togglePlay],
  );

  const toggleMuted = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMuted((m) => !m);
  }, []);

  return (
    <div ref={containerRef} className="relative size-full min-h-0">
      <MediaVideoFrame
        ref={videoRef}
        fit="cover"
        poster={poster}
        preload="metadata"
        className={className}
        onClick={onTap}
      />

      {!playing ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
            <IgPlay className="size-7 text-white" filled aria-hidden />
          </span>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={muted ? 'فعال‌سازی صدا' : 'قطع صدا'}
        onClick={toggleMuted}
        className="absolute end-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-black/50 text-white tap-none"
      >
        <IgVolume muted={muted} className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
