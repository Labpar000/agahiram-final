'use client';

import { useEffect, useRef } from 'react';
import { useManagedVideo } from '@/hooks/use-managed-video';
import { applySafariVideoAttrs, setupVideoSource } from '@/lib/video-playback';
import { MediaVideoFrame } from '@/components/media-video-frame';

type Props = {
  mediaUrl: string;
  hlsUrl?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  fit?: 'cover' | 'contain';
  /** When set, video joins the global playback controller (story viewer). */
  playbackId?: string;
  active?: boolean;
  loop?: boolean;
};

/** Story video — HLS + optional managed playback for single-audio policy. */
export function StoryVideo(props: Props) {
  if (props.playbackId) {
    return <ManagedStoryVideo {...props} playbackId={props.playbackId} />;
  }
  return <PreviewStoryVideo {...props} />;
}

function PreviewStoryVideo({
  mediaUrl,
  hlsUrl,
  autoPlay = true,
  muted = true,
  className,
  fit = 'cover',
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    applySafariVideoAttrs(video);
    return setupVideoSource(video, hlsUrl ?? undefined, mediaUrl);
  }, [hlsUrl, mediaUrl]);

  return (
    <MediaVideoFrame
      ref={ref}
      fit={fit}
      autoPlay={autoPlay}
      muted={muted}
      className={className}
      preload="metadata"
    />
  );
}

function ManagedStoryVideo({
  mediaUrl,
  hlsUrl,
  autoPlay = true,
  muted = true,
  className,
  fit = 'contain',
  playbackId,
  active = true,
  loop = false,
}: Props & { playbackId: string }) {
  const { videoRef } = useManagedVideo({
    id: playbackId,
    kind: 'story',
    hlsUrl,
    mp4Url: mediaUrl,
    active: active && autoPlay,
    loop,
    muted,
    autoplayWhenActive: autoPlay,
  });

  return (
    <MediaVideoFrame
      ref={videoRef}
      fit={fit}
      muted={muted}
      className={className}
      preload="metadata"
    />
  );
}
