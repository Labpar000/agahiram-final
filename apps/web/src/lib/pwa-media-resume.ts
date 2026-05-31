'use client';

/** Resume paused in-viewport videos after PWA / tab background (iOS Safari). */
export function resumeActiveVideos() {
  if (typeof document === 'undefined') return;
  const videos = document.querySelectorAll<HTMLVideoElement>('video');
  videos.forEach((video) => {
    const rect = video.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;
    if (video.readyState < 2) return;
    void video.play().catch(() => null);
  });
}
