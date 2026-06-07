'use client';

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { useManagedVideo } from '@/hooks/use-managed-video';
import { applySafariVideoAttrs, setupVideoSource } from '@/lib/video-playback';
import { MediaVideoFrame } from '@/components/media-video-frame';

function mergeVideoRef(
  target: MutableRefObject<HTMLVideoElement | null>,
  onVideoRef?: (video: HTMLVideoElement | null) => void,
) {
  return (node: HTMLVideoElement | null) => {
    target.current = node;
    onVideoRef?.(node);
  };
}

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
  /** Called when the underlying video element is mounted (for story progress sync). */
  onVideoRef?: (video: HTMLVideoElement | null) => void;
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
  onVideoRef,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    applySafariVideoAttrs(video);
    return setupVideoSource(video, hlsUrl ?? undefined, mediaUrl);
  }, [hlsUrl, mediaUrl]);

  const setRef = useCallback(mergeVideoRef(ref, onVideoRef), [onVideoRef]);

  return (
    <MediaVideoFrame
      ref={setRef}
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
  fit = 'cover',
  playbackId,
  active = true,
  loop = false,
  onVideoRef,
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

  const setRef = useCallback(mergeVideoRef(videoRef, onVideoRef), [videoRef, onVideoRef]);

  return (
    <MediaVideoFrame
      ref={setRef}
      fit={fit}
      autoPlay={autoPlay && active}
      muted={muted}
      className={className}
      preload="metadata"
      playsInline
    />
  );
}
