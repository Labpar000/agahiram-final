'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IgPause, IgPlay } from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import { formatVoiceDuration } from '@/lib/voice-recorder';
import { clearActiveVoiceAudio, setActiveVoiceAudio } from '@/lib/voice-playback';

type VoiceMessagePlayerProps = {
  src: string;
  durationMs?: number;
  isMine?: boolean;
  uploading?: boolean;
};

const WAVE_BARS = [0.35, 0.65, 0.45, 0.8, 0.55, 0.7, 0.4, 0.75, 0.5, 0.6, 0.45, 0.7];

export function VoiceMessagePlayer({
  src,
  durationMs,
  isMine = false,
  uploading = false,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs ?? 0);
  const [error, setError] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaying(false);
    setCurrentMs(0);
    setError(false);
    setLoading(!!src);
    audio.load();

    const onTime = () => setCurrentMs(Math.round(audio.currentTime * 1000));
    const onMeta = () => {
      setLoading(false);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotalMs(Math.round(audio.duration * 1000));
      }
    };
    const onCanPlay = () => setLoading(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentMs(0);
      clearActiveVoiceAudio(audio);
    };
    const onPause = () => {
      setPlaying(false);
      clearActiveVoiceAudio(audio);
    };
    const onPlay = () => {
      setPlaying(true);
      setActiveVoiceAudio(audio);
    };
    const onErr = () => {
      setLoading(false);
      setPlaying(false);
      setError(true);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('error', onErr);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('error', onErr);
      clearActiveVoiceAudio(audio);
    };
  }, [src]);

  useEffect(() => {
    if (durationMs) setTotalMs(durationMs);
  }, [durationMs]);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || uploading || !src || loading) return;
    if (playing) {
      audio.pause();
      return;
    }
    try {
      audio.playbackRate = rate;
      setLoading(true);
      await audio.play();
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, playing, rate, src, uploading]);

  const retry = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    setError(false);
    setLoading(true);
    audio.load();
    try {
      audio.playbackRate = rate;
      await audio.play();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [rate, src]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !totalMs || uploading) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      audio.currentTime = (ratio * totalMs) / 1000;
      setCurrentMs(Math.round(audio.currentTime * 1000));
    },
    [totalMs, uploading],
  );

  const cycleRate = useCallback(() => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [rate]);

  const progress = totalMs > 0 ? Math.min(100, (currentMs / totalMs) * 100) : 0;
  const displayTotal = totalMs || durationMs || 0;
  const displayCurrent = playing || currentMs > 0 ? currentMs : 0;

  const playBtnClass = isMine
    ? cn('bg-white/25 text-white hover:bg-white/35', playing && 'bg-white/40 ring-2 ring-white/50')
    : cn(
        'bg-foreground/10 text-foreground hover:bg-foreground/15',
        playing && 'bg-ig-link/15 text-ig-link ring-2 ring-ig-link/30',
      );

  const fillClass = isMine ? 'bg-white' : 'bg-ig-link';
  const metaClass = isMine ? 'text-white/85' : 'text-muted-foreground';
  const waveActiveClass = isMine ? 'bg-white' : 'bg-ig-link';
  const waveIdleClass = isMine ? 'bg-white/35' : 'bg-foreground/20';

  if (uploading && !src) {
    return (
      <div className="flex min-w-[12rem] items-center gap-2.5 py-1">
        <span
          className={cn(
            'size-9 shrink-0 animate-pulse rounded-full',
            isMine ? 'bg-white/25' : 'bg-foreground/10',
          )}
        />
        <div className="flex flex-1 flex-col gap-1">
          <div
            className={cn(
              'h-1.5 animate-pulse rounded-full',
              isMine ? 'bg-white/30' : 'bg-foreground/15',
            )}
          />
          <span className={cn('text-[10px]', metaClass)}>در حال ارسال…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-w-[12rem] flex-col gap-1.5 py-1">
        <span className={cn('text-xs', isMine ? 'text-white/90' : 'text-destructive')}>
          پخش ممکن نیست
        </span>
        <button
          type="button"
          className={cn('text-xs font-medium', isMine ? 'text-white underline' : 'text-ig-link')}
          onClick={() => void retry()}
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn('flex min-w-[12rem] items-center gap-2.5', isMine && 'flex-row-reverse')}
      dir="ltr"
    >
      <audio ref={audioRef} src={src || undefined} preload="metadata" className="hidden" />
      <button
        type="button"
        aria-label={playing ? 'توقف' : 'پخش'}
        disabled={!src || loading}
        onClick={() => void toggle()}
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full transition-colors',
          playBtnClass,
          (!src || loading) && 'opacity-60',
        )}
      >
        {loading && !playing ? (
          <span
            className={cn(
              'size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
            )}
            aria-hidden
          />
        ) : playing ? (
          <IgPause className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <IgPlay className="size-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={displayTotal}
          aria-valuenow={displayCurrent}
          aria-label="پیشرفت پخش"
          tabIndex={0}
          className="relative mb-1 flex h-6 cursor-pointer items-end gap-[2px]"
          onClick={seek}
        >
          {WAVE_BARS.map((h, i) => {
            const barProgress = (i / WAVE_BARS.length) * 100;
            const active = progress >= barProgress;
            return (
              <span
                key={i}
                className={cn(
                  'w-[3px] flex-1 rounded-full transition-colors duration-150',
                  active ? fillClass : waveIdleClass,
                  playing && active && 'animate-pulse',
                )}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <div
          className={cn(
            'flex items-center text-[10px] tabular-nums',
            metaClass,
            isMine ? 'justify-end' : 'justify-start',
          )}
        >
          <button
            type="button"
            onClick={cycleRate}
            className={cn(
              'me-2 font-medium',
              isMine ? 'hover:text-white' : 'hover:text-foreground',
            )}
          >
            {rate}x
          </button>
          <span>
            {formatVoiceDuration(displayCurrent)} / {formatVoiceDuration(displayTotal)}
          </span>
          {uploading ? (
            <span className={cn('ms-2', isMine ? 'text-white/70' : 'text-muted-foreground')}>
              · ارسال…
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
