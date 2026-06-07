'use client';

import { useRef } from 'react';
import { cn } from '@agahiram/shared';

const HOLD_MS = 220;

/** Instagram-spec tap zones: left 30% = prev, right 70% = next.
 *  Hold anywhere pauses playback; release resumes.
 *  No separate "pause" zone — Instagram doesn't have one. */
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
  const downXRef = useRef(0);
  const heldRef = useRef(false);

  const bindHold = () => ({
    onPointerDown: (e: React.PointerEvent) => {
      downAtRef.current = Date.now();
      downXRef.current = e.clientX;
      heldRef.current = false;
      onPauseChange(true);
    },
    onPointerUp: () => {
      if (Date.now() - downAtRef.current >= HOLD_MS) heldRef.current = true;
      onPauseChange(false);
    },
    onPointerLeave: () => onPauseChange(false),
    onPointerCancel: () => onPauseChange(false),
  });

  const bindNav = (action: () => void) => ({
    ...bindHold(),
    onClick: (e: React.MouseEvent) => {
      if (heldRef.current || Date.now() - downAtRef.current >= HOLD_MS) {
        e.preventDefault();
        return;
      }
      action();
    },
  });

  return (
    <div className={cn('absolute inset-0 z-[8] flex', className)} aria-hidden>
      <button
        type="button"
        aria-label="استوری قبلی"
        className="h-full bg-transparent"
        style={{ width: '30%' }}
        {...bindNav(onPrev)}
      />
      <button
        type="button"
        aria-label="استوری بعدی"
        className="h-full bg-transparent"
        style={{ width: '70%' }}
        {...bindNav(onNext)}
      />
    </div>
  );
}
