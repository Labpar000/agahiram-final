'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@agahiram/shared';

const HOLD_MS = 220;

/**
 * Instagram-exact tap zones for story navigation.
 * Left 30% = previous, right 70% = next.
 * Hold anywhere pauses playback; release resumes. Tap on hold = ignored.
 * This matches Instagram's actual behavior precisely.
 */
export function StoryViewerTapZones({
  onPrev,
  onNext,
  onPauseChange,
  className,
}: {
  onPrev: () => void;
  onNext: () => void;
  onPauseChange: (paused: boolean) => void;
  className?: string;
}) {
  const downAtRef = useRef(0);
  const heldRef = useRef(false);

  const onPointerDown = useCallback(() => {
    downAtRef.current = Date.now();
    heldRef.current = false;
    onPauseChange(true);
  }, [onPauseChange]);

  const onPointerUpPrev = useCallback(() => {
    if (Date.now() - downAtRef.current >= HOLD_MS) {
      heldRef.current = true;
    }
    onPauseChange(false);
    if (!heldRef.current) onPrev();
  }, [onPauseChange, onPrev]);

  const onPointerUpNext = useCallback(() => {
    if (Date.now() - downAtRef.current >= HOLD_MS) {
      heldRef.current = true;
    }
    onPauseChange(false);
    if (!heldRef.current) onNext();
  }, [onPauseChange, onNext]);

  const onPointerLeave = useCallback(() => {
    onPauseChange(false);
  }, [onPauseChange]);

  return (
    <div className={cn('absolute inset-0 z-[8] flex', className)} aria-hidden>
      <button
        type="button"
        aria-label="استوری قبلی"
        className="h-full bg-transparent focus:outline-none"
        style={{ width: '30%' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUpPrev}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerLeave}
      />
      <button
        type="button"
        aria-label="استوری بعدی"
        className="h-full bg-transparent focus:outline-none"
        style={{ width: '70%' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUpNext}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerLeave}
      />
    </div>
  );
}
