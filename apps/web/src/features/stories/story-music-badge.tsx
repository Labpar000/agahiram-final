'use client';

import { useEffect, useRef } from 'react';
import { STORY_MUSIC_TRACKS } from '@agahiram/shared/constants';

export function StoryMusicBadge({
  trackId,
  startMs = 0,
  displayMode = 'minimal',
  playing = true,
}: {
  trackId: string;
  startMs?: number;
  displayMode?: string;
  playing?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const track = STORY_MUSIC_TRACKS.find((t) => t.id === trackId);

  useEffect(() => {
    if (!track || !playing) return;
    const audio = new Audio(track.url);
    audioRef.current = audio;
    audio.currentTime = startMs / 1000;
    void audio.play().catch(() => undefined);
    return () => {
      audio.pause();
    };
  }, [track, startMs, playing]);

  if (!track) return null;

  return (
    <div className="absolute start-3 top-24 z-10 flex max-w-[70%] items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-md">
      <span aria-hidden>🎵</span>
      <span className="truncate font-semibold">{track.title}</span>
      {displayMode === 'album' ? (
        <span className="truncate text-white/70">{track.artist}</span>
      ) : null}
    </div>
  );
}
