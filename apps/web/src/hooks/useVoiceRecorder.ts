'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from '@agahiram/ui';
import {
  VoiceRecorderSession,
  formatVoiceDuration,
  type VoiceRecordingResult,
} from '@/lib/voice-recorder';

export type VoiceRecorderPhase = 'idle' | 'recording' | 'processing';

export function useVoiceRecorder(
  onRecorded?: (result: VoiceRecordingResult) => void | Promise<void>,
) {
  const sessionRef = useRef<VoiceRecorderSession | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;
  const phaseRef = useRef<VoiceRecorderPhase>('idle');

  const [phase, setPhase] = useState<VoiceRecorderPhase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);

  const setPhaseSafe = useCallback((next: VoiceRecorderPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const finish = useCallback(
    async (maxDuration = false): Promise<VoiceRecordingResult | null> => {
      if (phaseRef.current !== 'recording') return null;
      setPhaseSafe('processing');
      activePointerRef.current = null;

      const session = sessionRef.current;
      sessionRef.current = null;
      if (!session) {
        setPhaseSafe('idle');
        setElapsedMs(0);
        return null;
      }

      try {
        const result = await session.stop(maxDuration);
        if (!result) {
          if (!maxDuration) toast.error('خیلی کوتاه بود');
          return null;
        }
        if (maxDuration) toast.error('حداکثر زمان ضبط ۵ دقیقه است');
        navigator.vibrate?.(10);
        await onRecordedRef.current?.(result);
        return result;
      } finally {
        setPhaseSafe('idle');
        setElapsedMs(0);
      }
    },
    [setPhaseSafe],
  );

  const start = useCallback(
    async (pointerId: number) => {
      if (phaseRef.current !== 'idle') return;
      activePointerRef.current = pointerId;
      setPhaseSafe('recording');
      setElapsedMs(0);

      try {
        const session = new VoiceRecorderSession();
        sessionRef.current = session;
        await session.start(setElapsedMs, () => {
          void finish(true);
        });
        navigator.vibrate?.(10);
      } catch {
        sessionRef.current = null;
        activePointerRef.current = null;
        setPhaseSafe('idle');
        toast.error('دسترسی به میکروفون ممکن نیست');
      }
    },
    [finish, setPhaseSafe],
  );

  const cancel = useCallback(() => {
    sessionRef.current?.cancel();
    sessionRef.current = null;
    activePointerRef.current = null;
    setPhaseSafe('idle');
    setElapsedMs(0);
  }, [setPhaseSafe]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (phaseRef.current !== 'idle') return;
      e.currentTarget.setPointerCapture(e.pointerId);
      void start(e.pointerId);
    },
    [start],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      void finish(false);
    },
    [finish],
  );

  const handlePointerCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    phase,
    elapsedMs,
    elapsedLabel: formatVoiceDuration(elapsedMs),
    isRecording: phase === 'recording',
    isProcessing: phase === 'processing',
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    cancel,
  };
}
