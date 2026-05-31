'use client';

import { videoPlaybackController } from '@/lib/video-playback-controller';

/** Resume the controller-managed active video after PWA / tab foreground. */
export function resumeActiveVideos() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') return;
  videoPlaybackController.resumeActive();
}
