'use client';

// FIXED: rAF-based progress tracking + source-ready autoplay + playback recovery
import { useCallback, useEffect, useRef, useState } from 'react';
import { videoPlaybackController, type VideoPlaybackKind } from '@/lib/video-playback-controller';
import {
  installVideoPlaybackRecovery,
  setupVideoSource,
  trackVideoProgress,
  type VideoSourceHandle,
} from '@/lib/video-playback';

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
  const sourceRef = useRef<VideoSourceHandle | null>(null);
  const cleanupTrackingRef = useRef<(() => void) | undefined>(undefined);
  const cleanupRecoveryRef = useRef<(() => void) | undefined>(undefined);
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

    sourceRef.current?.cleanup();
    const source = setupVideoSource(video, hlsUrl ?? undefined, mp4Url ?? undefined);
    sourceRef.current = source;

    cleanupRecoveryRef.current?.();
    cleanupRecoveryRef.current = installVideoPlaybackRecovery(video, {
      getHls: source.getHls,
    });

    let cancelled = false;
    const shouldAutoplay = kind === 'reel' ? reelAutoplay : autoplayWhenActive;

    void source.ready.then(() => {
      if (cancelled || !activeRef.current || !video.isConnected) return;
      if (shouldAutoplay && !videoPlaybackController.isUserPaused(id)) {
        void videoPlaybackController.requestPlay(id, { resetUserPaused: true });
      }
    });

    return () => {
      cancelled = true;
      cleanupRecoveryRef.current?.();
      cleanupRecoveryRef.current = undefined;
      source.cleanup();
      if (sourceRef.current === source) sourceRef.current = null;
    };
  }, [active, hlsUrl, mp4Url, id, kind, reelAutoplay, autoplayWhenActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
    }
  }, [active, kind]);

  // Retry autoplay when the container becomes visible (hidden tab slots, iOS display:none).
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const shouldAutoplay = kind === 'reel' ? reelAutoplay : autoplayWhenActive;
    if (!shouldAutoplay) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.25) return;
        if (!activeRef.current || videoPlaybackController.isUserPaused(id)) return;
        void videoPlaybackController.requestPlay(id, { resetUserPaused: false });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    obs.observe(container);
    return () => obs.disconnect();
  }, [active, id, kind, reelAutoplay, autoplayWhenActive]);

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
