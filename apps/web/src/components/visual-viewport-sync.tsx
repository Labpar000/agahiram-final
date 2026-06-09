'use client';

import { useVisualViewport } from '@/hooks/use-visual-viewport';

/** Client boundary — mounts visual viewport CSS var sync once per main layout. */
export function VisualViewportSync() {
  useVisualViewport();
  return null;
}
