'use client';

// FIXED: rAF-based progress tracking + proper cleanup + reelAutoplay fix
import { useCallback, useEffect, useRef, useState } from 'react';
import { videoPlaybackController, type VideoPlaybackKind } from '@/lib/video-playback-controller';
import { setupVideoSource, trackVideoProgress } from '@/lib/video-playback';

type UseManagedVideoOptions = {
  id: string;
  kind: VideoPlaybackKind;
  hlsUrl?: string | null;
  mp4Url?: string | null;
  active?: boolean;
  loop?: boolean;
  muted?: boolean;
  autoplayWhenActive?: boolean;
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
  const cleanupSourceRef = useRef<(() => void) | undefined>(undefined);
  const cleanupTrackingRef = useRef<(() => void) | undefined>(undefined);
  const activeRef = useRef(active);
  activeRef.current = active;

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

    // Cleanup previous source setup
    cleanupSourceRef.current?.();
    cleanupSourceRef.current = setupVideoSource(video, hlsUrl ?? undefined, mp4Url ?? undefined);

    return () => {
      cleanupSourceRef.current?.();
      cleanupSourceRef.current = undefined;
    };
  }, [active, hlsUrl, mp4Url, id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // FIXED: rAF-based progress tracking instead of timeupdate for buttery-smooth progress bar
    if (active) {
      cleanupTrackingRef.current?.();
      const stop = trackVideoProgress(video, (ratio) => {
        if (activeRef.current) setProgress(ratio);
      });
      cleanupTrackingRef.current = stop;
    } else {
      cleanupTrackingRef.current?.();
      cleanupTrackingRef.current = undefined;
    }

    return () => {
      cleanupTrackingRef.current?.();
      cleanupTrackingRef.current = undefined;
    };
  }, [id, active]);

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
      setProgress(0);
      return;
    }
    const shouldAutoplay = kind === 'reel' ? reelAutoplay : autoplayWhenActive;
    if (shouldAutoplay && !videoPlaybackController.isUserPaused(id)) {
      void videoPlaybackController.requestPlay(id, { resetUserPaused: true });
    }
  }, [active, id, autoplayWhenActive, reelAutoplay, kind]);

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
