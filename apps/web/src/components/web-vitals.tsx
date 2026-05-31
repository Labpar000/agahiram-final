'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
// 2026 Core Web Vitals budgets (good thresholds). Used to flag regressions.
const BUDGETS: Record<string, number> = {
  LCP: 2500, // ms
  INP: 200, // ms
  CLS: 0.1, // unitless
  FCP: 1800, // ms
  TTFB: 800, // ms
};

/**
 * Reports Core Web Vitals. In development it logs to the console and warns when
 * a metric exceeds its budget. In production it beacons to `/api/v1/metrics/web-vitals`
 * if the endpoint exists (fire-and-forget; failures are ignored).
 */
function reportBfcacheRestore() {
  if (typeof window === 'undefined') return;
  try {
    performance.mark('bfcache-restore');
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.type === 'back_forward') {
      // eslint-disable-next-line no-console
      console.info('[web-vitals] navigation=back_forward (bfcache candidate)');
    }
  } catch {
    /* noop */
  }
}

export function WebVitals() {
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) reportBfcacheRestore();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useReportWebVitals((metric) => {
    const budget = BUDGETS[metric.name];
    if (process.env.NODE_ENV === 'development') {
      const overBudget = budget !== undefined && metric.value > budget;
      const tag = overBudget ? '⚠️ over budget' : 'ok';
      // eslint-disable-next-line no-console
      console.info(`[web-vitals] ${metric.name}=${Math.round(metric.value)} (${tag})`);
      return;
    }
    try {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
      });
      navigator.sendBeacon?.('/api/v1/metrics/web-vitals', body);
    } catch {
      /* metrics are best-effort */
    }
  });
  return null;
}
