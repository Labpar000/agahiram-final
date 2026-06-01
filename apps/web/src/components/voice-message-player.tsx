'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@agahiram/shared';
import { formatVoiceDuration } from '@/lib/voice-recorder';

type VoiceMessagePlayerProps = {
  src: string;
  durationMs?: number;
  isMine?: boolean;
  uploading?: boolean;
};

export function VoiceMessagePlayer({
  src,
  durationMs,
  isMine = false,
  uploading = false,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs ?? 0);
  const [error, setError] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentMs(Math.round(audio.currentTime * 1000));
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotalMs(Math.round(audio.duration * 1000));
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentMs(0);
    };
    const onErr = () => setError(true);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onErr);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onErr);
    };
  }, [src]);

  useEffect(() => {
    if (durationMs) setTotalMs(durationMs);
  }, [durationMs]);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || uploading || !src) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      audio.playbackRate = rate;
      await audio.play();
      setPlaying(true);
      setError(false);
    } catch {
      setError(true);
    }
  }, [playing, rate, src, uploading]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !totalMs) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      audio.currentTime = (ratio * totalMs) / 1000;
      setCurrentMs(Math.round(audio.currentTime * 1000));
    },
    [totalMs],
  );

  const cycleRate = useCallback(() => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [rate]);

  const progress = totalMs > 0 ? Math.min(100, (currentMs / totalMs) * 100) : 0;

  if (uploading) {
    return (
      <div className="flex min-w-[10rem] items-center gap-2 py-1">
        <span className="size-8 animate-pulse rounded-full bg-muted" />
        <span className="text-xs text-muted-foreground">در حال ارسال…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-w-[10rem] flex-col gap-1 py-1">
        <span className="text-xs text-destructive">پخش ممکن نیست</span>
        <button type="button" className="text-xs text-ig-link" onClick={() => setError(false)}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-[11rem] items-center gap-2', isMine && 'flex-row-reverse')}>
      <audio ref={audioRef} src={src || undefined} preload="metadata" className="hidden" />
      <button
        type="button"
        aria-label={playing ? 'توقف' : 'پخش'}
        onClick={() => void toggle()}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/10 text-foreground"
      >
        {playing ? (
          <Pause className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Play className="size-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={totalMs}
          aria-valuenow={currentMs}
          tabIndex={0}
          className="h-1.5 cursor-pointer rounded-full bg-foreground/15"
          onClick={seek}
        >
          <div
            className="h-full rounded-full bg-ig-link transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div
          className={cn(
            'mt-1 flex text-[10px] tabular-nums text-muted-foreground',
            isMine && 'justify-end',
          )}
        >
          <button type="button" onClick={cycleRate} className="me-2 hover:text-foreground">
            {rate}x
          </button>
          <span>
            {formatVoiceDuration(currentMs || 0)} /{' '}
            {formatVoiceDuration(totalMs || durationMs || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
