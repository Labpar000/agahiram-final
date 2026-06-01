'use client';

import { useRef } from 'react';
import { cn } from '@agahiram/shared';

const HOLD_MS = 220;

/** IG tap zones: sides navigate, hold anywhere pauses without skipping. */
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

  const bindHold = () => ({
    onPointerDown: () => {
      downAtRef.current = Date.now();
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
        className="h-full w-1/3 cursor-w-resize bg-transparent rtl:cursor-e-resize"
        {...bindNav(onPrev)}
      />
      <button
        type="button"
        aria-label="مکث"
        className="h-full w-1/3 bg-transparent"
        {...bindHold()}
      />
      <button
        type="button"
        aria-label="استوری بعدی"
        className="h-full w-1/3 cursor-e-resize bg-transparent rtl:cursor-w-resize"
        {...bindNav(onNext)}
      />
    </div>
  );
}
