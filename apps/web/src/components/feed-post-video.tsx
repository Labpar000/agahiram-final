'use client';

import { useEffect, useRef } from 'react';
import { applySafariVideoAttrs, setupVideoSource } from '@/lib/video-playback';

type Props = {
  hlsUrl?: string | null;
  mp4Url?: string;
  poster?: string;
  className?: string;
  active?: boolean;
};

/** Feed card video with native HLS (Safari) and bfcache-safe reload. */
export function FeedPostVideo({ hlsUrl, mp4Url, poster, className, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    return setupVideoSource(video, hlsUrl ?? undefined, mp4Url ?? undefined);
  }, [active, hlsUrl, mp4Url]);

  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      className={className}
      controls
      playsInline
      preload="metadata"
    />
  );
}
