'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { videoPlaybackController, type VideoPlaybackKind } from '@/lib/video-playback-controller';
import { setupVideoSource } from '@/lib/video-playback';

type UseManagedVideoOptions = {
  id: string;
  kind: VideoPlaybackKind;
  hlsUrl?: string | null;
  mp4Url?: string | null;
  active?: boolean;
  loop?: boolean;
  muted?: boolean;
  /** When true, active feed item auto-plays via controller. */
  autoplayWhenActive?: boolean;
  /** Reels page drives playback via activeIndex — avoid duplicate requestPlay. */
  reelAutoplay?: boolean;
};

export function useManagedVideo({
  id,
  kind,
  hlsUrl,
  mp4Url,
  active = true,
  loop = false,
  muted = true,
  autoplayWhenActive = true,
  reelAutoplay = false,
}: UseManagedVideoOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = loop;
    video.muted = muted;
  }, [loop, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    return videoPlaybackController.register(id, video, kind, setPlaying);
  }, [id, kind]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    return setupVideoSource(video, hlsUrl ?? undefined, mp4Url ?? undefined);
  }, [active, hlsUrl, mp4Url, id]);

  useEffect(() => {
    if (!active) {
      const video = videoRef.current;
      video?.pause();
      if (video && kind === 'reel') {
        try {
          video.currentTime = 0;
        } catch {
          /* noop */
        }
      }
      setPlaying(false);
      return;
    }
    const shouldAutoplay = kind === 'reel' ? reelAutoplay : autoplayWhenActive;
    if (shouldAutoplay && !videoPlaybackController.isUserPaused(id)) {
      void videoPlaybackController.requestPlay(id, { resetUserPaused: true });
    }
  }, [active, id, autoplayWhenActive, reelAutoplay, kind]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (video.duration) setProgress(video.currentTime / video.duration);
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, [id, active]);

  const togglePlay = useCallback(() => {
    videoPlaybackController.togglePlay(id);
  }, [id]);

  const seek = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video?.duration) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    video.currentTime = clamped * video.duration;
    setProgress(clamped);
  }, []);

  return {
    videoRef,
    containerRef,
    playing,
    progress,
    togglePlay,
    seek,
    setPlaying,
  };
}
