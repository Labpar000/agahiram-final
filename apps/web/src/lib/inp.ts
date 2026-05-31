'use client';

import { startTransition } from 'react';

type SchedulerWithYield = {
  yield?: () => Promise<void>;
};

const engagementLast = new Map<string, number>();

/** Debounce rapid like/save taps (INP — avoid stacked mutations). */
export function debounceEngagement(key: string, ms = 280): boolean {
  const now = Date.now();
  const last = engagementLast.get(key) ?? 0;
  if (now - last < ms) return false;
  engagementLast.set(key, now);
  return true;
}

/** Break long tasks before optimistic UI updates (INP 2026). */
export async function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler;
  if (scheduler?.yield) {
    await scheduler.yield();
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Schedule engagement mutations after yielding to the main thread. */
export function scheduleEngagement(work: () => void): void {
  void yieldToMain().then(() => {
    startTransition(work);
  });
}

/** Debounce + yield + transition — use for like/save/comment-like. */
export function runEngagementAction(key: string, work: () => void, debounceMs = 280): void {
  if (!debounceEngagement(key, debounceMs)) return;
  scheduleEngagement(work);
}
