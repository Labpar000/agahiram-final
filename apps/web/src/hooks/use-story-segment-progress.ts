'use client';

import { useEffect, useRef, useState } from 'react';

/** Drives IG-style story segment progress with proper pause/resume. */
export function useStorySegmentProgress({
  segmentKey,
  segmentMs,
  paused,
  onComplete,
}: {
  segmentKey: string | undefined;
  segmentMs: number;
  paused: boolean;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastKeyRef = useRef<string | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!segmentKey || segmentMs <= 0) return;

    if (lastKeyRef.current !== segmentKey) {
      lastKeyRef.current = segmentKey;
      elapsedRef.current = 0;
      setProgress(0);
    }

    if (paused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const start = performance.now() - elapsedRef.current;

    const tick = () => {
      const elapsed = performance.now() - start;
      elapsedRef.current = elapsed;
      const pct = Math.min(1, elapsed / segmentMs);
      setProgress(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        elapsedRef.current = 0;
        setProgress(1);
        onCompleteRef.current();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [segmentKey, segmentMs, paused]);

  return progress;
}
