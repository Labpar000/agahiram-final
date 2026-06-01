'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStorySegmentProgress } from '@/hooks/use-story-segment-progress';

const STORY_IMAGE_MS = 5_000;

/** Image timer + video element sync for IG-style story playback. */
export function useStoryPlayback({
  storyId,
  mediaType,
  durationMs,
  paused,
  onComplete,
}: {
  storyId: string | undefined;
  mediaType: 'image' | 'video' | undefined;
  durationMs?: number;
  paused: boolean;
  onComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const segmentMs =
    mediaType === 'video'
      ? Math.max(1000, durationMs ?? STORY_IMAGE_MS)
      : (durationMs ?? STORY_IMAGE_MS);

  const timerProgress = useStorySegmentProgress({
    segmentKey: mediaType === 'image' ? storyId : undefined,
    segmentMs,
    paused,
    onComplete,
  });

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    setVideoEl(el);
  }, []);

  useEffect(() => {
    if (mediaType !== 'video') {
      setVideoProgress(0);
      setVideoEl(null);
      return;
    }
    const video = videoEl;
    if (!video) return;

    setVideoProgress(0);

    const onTime = () => {
      if (!video.duration || !Number.isFinite(video.duration)) return;
      setVideoProgress(Math.min(1, video.currentTime / video.duration));
    };

    const onEnded = () => {
      setVideoProgress(1);
      onCompleteRef.current();
    };

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('ended', onEnded);
    };
  }, [mediaType, storyId, videoEl]);

  useEffect(() => {
    const video = videoEl;
    if (!video || mediaType !== 'video') return;
    if (paused) video.pause();
    else void video.play().catch(() => undefined);
  }, [paused, mediaType, storyId, videoEl]);

  const progress = mediaType === 'video' ? videoProgress : timerProgress;

  return { progress, attachVideo, segmentMs };
}
