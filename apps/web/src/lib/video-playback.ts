'use client';

import { videoPlaybackController } from '@/lib/video-playback-controller';

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
    videoPlaybackController.pauseAll();
  });
}

export type VideoSourceHandle = {
  cleanup: () => void;
  /** Resolves once the element can start playback (manifest parsed / canplay). */
  ready: Promise<void>;
  getHls?: () => import('hls.js').default | null;
};

function whenVideoCanPlay(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('canplay', done);
      video.removeEventListener('loadeddata', done);
      resolve();
    };
    video.addEventListener('canplay', done, { once: true });
    video.addEventListener('loadeddata', done, { once: true });
  });
}

const noopSourceHandle: VideoSourceHandle = {
  cleanup: () => undefined,
  ready: Promise.resolve(),
};

/** Attach HLS (native or hls.js) or MP4; returns cleanup + ready promise. */
export function setupVideoSource(
  video: HTMLVideoElement,
  hlsUrl: string | undefined,
  mp4Url: string | undefined,
): VideoSourceHandle {
  applySafariVideoAttrs(video);
  const mp4 = mp4Url ?? undefined;
  const hls = hlsUrl ?? undefined;
  if (!hls && !mp4) return noopSourceHandle;

  if (hls && supportsNativeHls(video)) {
    video.src = hls;
    return {
      ready: whenVideoCanPlay(video),
      cleanup: () => {
        video.removeAttribute('src');
        video.load();
      },
    };
  }

  if (hls && !supportsNativeHls(video)) {
    let instance: import('hls.js').default | null = null;
    let cancelled = false;
    let resolveReady: (() => void) | null = null;
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    void import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled || !video.isConnected) {
          resolveReady?.();
          return;
        }
        if (Hls.isSupported()) {
          instance = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true,
          });
          instance.on(Hls.Events.MANIFEST_PARSED, () => resolveReady?.());
          instance.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal || !instance) return;
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              instance.recoverMediaError();
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              instance.startLoad();
            }
          });
          instance.loadSource(hls);
          instance.attachMedia(video);
        } else {
          video.src = mp4 ?? hls;
          void whenVideoCanPlay(video).then(() => resolveReady?.());
        }
      })
      .catch(() => resolveReady?.());

    return {
      ready,
      getHls: () => instance,
      cleanup: () => {
        cancelled = true;
        resolveReady?.();
        try {
          instance?.destroy();
        } catch {
          /* noop */
        }
        instance = null;
        video.removeAttribute('src');
        video.load();
      },
    };
  }

  video.src = mp4 ?? hls ?? '';
  return {
    ready: whenVideoCanPlay(video),
    cleanup: () => {
      video.removeAttribute('src');
      video.load();
    },
  };
}

/** Recover from buffer stalls and audio-only freezes (time advances, frames do not). */
export function installVideoPlaybackRecovery(
  video: HTMLVideoElement,
  options?: { getHls?: () => import('hls.js').default | null },
): () => void {
  let waitingTimer: ReturnType<typeof setTimeout> | null = null;
  let rvfcId = 0;
  let pollId: ReturnType<typeof setInterval> | null = null;
  let lastFrameAt = 0;
  let lastSeenTime = -1;
  let timesMovedWithoutFrame = 0;

  const clearWaitingTimer = () => {
    if (waitingTimer) {
      clearTimeout(waitingTimer);
      waitingTimer = null;
    }
  };

  const nudgePlayback = () => {
    if (video.paused || video.ended) return;
    const hls = options?.getHls?.();
    if (hls) {
      try {
        hls.recoverMediaError();
      } catch {
        /* noop */
      }
    }
    const t = video.currentTime;
    try {
      video.currentTime = Math.max(0, t - 0.05);
    } catch {
      /* noop */
    }
    void video.play().catch(() => {});
    lastFrameAt = performance.now();
    timesMovedWithoutFrame = 0;
  };

  const scheduleWaitingRecovery = () => {
    clearWaitingTimer();
    waitingTimer = setTimeout(() => {
      if (!video.paused && !video.ended) nudgePlayback();
    }, 1500);
  };

  const onWaiting = () => scheduleWaitingRecovery();
  const onStalled = () => scheduleWaitingRecovery();
  const onPlaying = () => {
    clearWaitingTimer();
    lastFrameAt = performance.now();
    timesMovedWithoutFrame = 0;
  };

  const stopFrameWatch = () => {
    if (rvfcId && 'cancelVideoFrameCallback' in video) {
      video.cancelVideoFrameCallback(rvfcId);
      rvfcId = 0;
    }
    if (pollId) {
      clearInterval(pollId);
      pollId = null;
    }
  };

  const startFrameWatch = () => {
    stopFrameWatch();
    lastFrameAt = performance.now();
    lastSeenTime = video.currentTime;

    if ('requestVideoFrameCallback' in video) {
      const onFrame = () => {
        lastFrameAt = performance.now();
        timesMovedWithoutFrame = 0;
        rvfcId = video.requestVideoFrameCallback(onFrame);
      };
      rvfcId = video.requestVideoFrameCallback(onFrame);
    }

    pollId = setInterval(() => {
      if (video.paused || video.ended) return;
      const ct = video.currentTime;
      if (ct !== lastSeenTime) {
        if (performance.now() - lastFrameAt > 1200) {
          timesMovedWithoutFrame += 1;
        }
        lastSeenTime = ct;
      }
      if (timesMovedWithoutFrame >= 2 || performance.now() - lastFrameAt > 2500) {
        nudgePlayback();
      }
    }, 800);
  };

  video.addEventListener('waiting', onWaiting);
  video.addEventListener('stalled', onStalled);
  video.addEventListener('playing', onPlaying);
  video.addEventListener('play', startFrameWatch);
  video.addEventListener('pause', stopFrameWatch);
  video.addEventListener('ended', stopFrameWatch);

  if (!video.paused) startFrameWatch();

  return () => {
    clearWaitingTimer();
    stopFrameWatch();
    video.removeEventListener('waiting', onWaiting);
    video.removeEventListener('stalled', onStalled);
    video.removeEventListener('playing', onPlaying);
    video.removeEventListener('play', startFrameWatch);
    video.removeEventListener('pause', stopFrameWatch);
    video.removeEventListener('ended', stopFrameWatch);
  };
}

// FIXED: localStorage instead of sessionStorage — persists across tabs/sessions like Instagram
const REELS_MUTE_KEY = 'reels_muted';

export function getReelsMutedPreference(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(REELS_MUTE_KEY) !== '0';
}

export function setReelsMutedPreference(muted: boolean) {
  try {
    localStorage.setItem(REELS_MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Feed card: report when ≥80% visible in viewport (Instagram threshold). */
export function observeFeedVideo(
  container: HTMLElement,
  onVisibleChange: (visible: boolean) => void,
): () => void {
  const obs = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      onVisibleChange(entry.isIntersecting && entry.intersectionRatio >= 0.8);
    },
    { threshold: [0, 0.8, 1] },
  );
  obs.observe(container);
  return () => obs.disconnect();
}

// FIXED: Reels IntersectionObserver with 0.8 threshold for active detection
export function observeReelItem(
  container: HTMLElement,
  onActiveChange: (active: boolean) => void,
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onActiveChange(true);
    return () => {};
  }
  const obs = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      onActiveChange(entry.isIntersecting && entry.intersectionRatio >= 0.8);
    },
    { threshold: [0, 0.8, 1], rootMargin: '0px' },
  );
  obs.observe(container);
  return () => obs.disconnect();
}

// FIXED: rAF-based progress tracking — pauses during buffer waits / frame stalls
export function trackVideoProgress(
  video: HTMLVideoElement,
  onProgress: (ratio: number) => void,
): () => void {
  let rafId = 0;
  let buffering = false;

  const tick = () => {
    if (
      !buffering &&
      !video.paused &&
      !video.seeking &&
      video.duration &&
      !Number.isNaN(video.duration)
    ) {
      onProgress(video.currentTime / video.duration);
    }
    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  };
  const stop = () => cancelAnimationFrame(rafId);
  const onWaiting = () => {
    buffering = true;
  };
  const onPlaying = () => {
    buffering = false;
  };
  const onEnded = () => {
    stop();
    onProgress(1);
  };

  video.addEventListener('play', start);
  video.addEventListener('pause', stop);
  video.addEventListener('ended', onEnded);
  video.addEventListener('waiting', onWaiting);
  video.addEventListener('playing', onPlaying);

  if (!video.paused) start();

  return () => {
    stop();
    video.removeEventListener('play', start);
    video.removeEventListener('pause', stop);
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('waiting', onWaiting);
    video.removeEventListener('playing', onPlaying);
  };
}
