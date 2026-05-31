'use client';

import { resumeActiveVideos } from '@/lib/pwa-media-resume';

export const SAFARI_VIDEO_ATTRS = {
  playsInline: true,
  'webkit-playsinline': 'true',
  'x-webkit-airplay': 'allow',
} as const;

export function applySafariVideoAttrs(video: HTMLVideoElement) {
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
}

export function supportsNativeHls(video?: HTMLVideoElement | null): boolean {
  if (typeof document === 'undefined') return false;
  const el = video ?? document.createElement('video');
  return (
    el.canPlayType('application/vnd.apple.mpegurl') !== '' ||
    el.canPlayType('application/x-mpegURL') !== ''
  );
}

export function resetVideoElement(video: HTMLVideoElement | null) {
  if (!video) return;
  video.pause();
  try {
    video.load();
  } catch {
    /* noop */
  }
}

/** Reset every in-DOM video after bfcache restore (Safari/Chrome 2025+). */
export function resetAllPageVideos() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('video').forEach((el) => resetVideoElement(el));
}

let videoBfcacheInstalled = false;

export function installVideoBfcacheHandlers() {
  if (videoBfcacheInstalled || typeof window === 'undefined') return;
  videoBfcacheInstalled = true;

  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    resetAllPageVideos();
    resumeActiveVideos();
  });
}

/** Attach HLS (native or hls.js) or MP4; returns cleanup. */
export function setupVideoSource(
  video: HTMLVideoElement,
  hlsUrl: string | undefined,
  mp4Url: string | undefined,
): () => void {
  applySafariVideoAttrs(video);
  const mp4 = mp4Url ?? undefined;
  const hls = hlsUrl ?? undefined;
  if (!hls && !mp4) return () => undefined;

  if (hls && supportsNativeHls(video)) {
    video.src = hls;
    return () => {
      video.removeAttribute('src');
      video.load();
    };
  }

  if (hls && !supportsNativeHls(video)) {
    let instance: import('hls.js').default | null = null;
    let cancelled = false;
    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !video) return;
      if (Hls.isSupported()) {
        instance = new Hls({ maxBufferLength: 8 });
        instance.loadSource(hls);
        instance.attachMedia(video);
      } else {
        video.src = mp4 ?? hls;
      }
    });
    return () => {
      cancelled = true;
      try {
        instance?.destroy();
      } catch {
        /* noop */
      }
      video.removeAttribute('src');
      video.load();
    };
  }

  video.src = mp4 ?? hls ?? '';
  return () => {
    video.removeAttribute('src');
    video.load();
  };
}

const REELS_MUTE_KEY = 'reels_muted';

export function getReelsMutedPreference(): boolean {
  if (typeof sessionStorage === 'undefined') return true;
  return sessionStorage.getItem(REELS_MUTE_KEY) !== '0';
}

export function setReelsMutedPreference(muted: boolean) {
  try {
    sessionStorage.setItem(REELS_MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Play when ≥50% visible; pause and reset when leaving viewport. */
export function observeReelPlayback(
  container: HTMLElement,
  video: HTMLVideoElement,
  active: boolean,
  onPlayingChange?: (playing: boolean) => void,
): () => void {
  const obs = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry || !active) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        void video
          .play()
          .then(() => onPlayingChange?.(true))
          .catch(() => onPlayingChange?.(false));
      } else {
        video.pause();
        video.currentTime = 0;
        onPlayingChange?.(false);
      }
    },
    { threshold: [0, 0.5, 1] },
  );
  obs.observe(container);
  return () => obs.disconnect();
}
