'use client';

import { useEffect, useRef } from 'react';
import { useManagedVideo } from '@/hooks/use-managed-video';
import { applySafariVideoAttrs, setupVideoSource } from '@/lib/video-playback';
import { videoPlaybackController } from '@/lib/video-playback-controller';

type Props = {
  mediaUrl: string;
  hlsUrl?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
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

function PreviewStoryVideo({ mediaUrl, hlsUrl, autoPlay = true, muted = true, className }: Props) {
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

function ManagedStoryVideo({
  mediaUrl,
  hlsUrl,
  autoPlay = true,
  muted = true,
  className,
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

  useEffect(() => {
    if (!active || !autoPlay) return;
    videoPlaybackController.pauseExcept(playbackId);
    void videoPlaybackController.requestPlay(playbackId, { resetUserPaused: true });
  }, [active, autoPlay, playbackId]);

  return (
    <video ref={videoRef} playsInline muted={muted} className={className} preload="metadata" />
  );
}
