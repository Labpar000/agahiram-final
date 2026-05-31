'use client';

import { useEffect, useRef } from 'react';
import { applySafariVideoAttrs, setupVideoSource } from '@/lib/video-playback';

/** Story viewer video — native HLS on Safari, playsinline. */
export function StoryVideo({
  mediaUrl,
  hlsUrl,
  autoPlay = true,
  muted = true,
  className,
}: {
  mediaUrl: string;
  hlsUrl?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    applySafariVideoAttrs(video);
    return setupVideoSource(video, hlsUrl ?? undefined, mediaUrl);
  }, [hlsUrl, mediaUrl]);

  return (
    <video
      ref={ref}
      autoPlay={autoPlay}
      playsInline
      muted={muted}
      className={className}
      preload="metadata"
    />
  );
}
