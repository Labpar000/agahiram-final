'use client';

import { IgMic } from '@agahiram/ui';
import { cn } from '@agahiram/shared';

type VoiceRecordOverlayProps = {
  elapsedLabel: string;
  visible: boolean;
};

export function VoiceRecordOverlay({ elapsedLabel, visible }: VoiceRecordOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-full mb-2 flex items-center justify-center px-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-full border border-border-subtle bg-surface/95 px-4 py-2 shadow-lg backdrop-blur-md">
        <span
          className={cn(
            'grid size-8 place-items-center rounded-full bg-destructive/15 text-destructive',
            'animate-pulse',
          )}
        >
          <IgMic className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">در حال ضبط…</span>
          <span className="text-sm tabular-nums text-muted-foreground">{elapsedLabel}</span>
        </div>
      </div>
    </div>
  );
}
