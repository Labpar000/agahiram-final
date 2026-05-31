'use client';

import { useEffect, useRef, useState } from 'react';
import { STORY_MUSIC_TRACKS } from '@agahiram/shared/constants';
import { Button, Label } from '@agahiram/ui';
import { cn } from '@agahiram/shared';

export type StoryMusicSelection = {
  trackId: string;
  startMs: number;
  displayMode: 'minimal' | 'album' | 'lyrics';
};

export function StoryMusicPicker({
  value,
  onChange,
}: {
  value: StoryMusicSelection | null;
  onChange: (v: StoryMusicSelection | null) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const playPreview = (trackId: string, url: string) => {
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setPreviewId(trackId);
    void audio.play().catch(() => setPreviewId(null));
    audio.onended = () => setPreviewId(null);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <Label>موسیقی</Label>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            حذف
          </Button>
        ) : null}
      </div>
      <ul className="space-y-2">
        {STORY_MUSIC_TRACKS.map((t) => {
          const selected = value?.trackId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm',
                  selected ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted/50',
                )}
                onClick={() => {
                  onChange({
                    trackId: t.id,
                    startMs: value?.startMs ?? 0,
                    displayMode: value?.displayMode ?? 'minimal',
                  });
                  playPreview(t.id, t.url);
                }}
              >
                <span>
                  <span className="font-semibold">{t.title}</span>
                  <span className="ms-2 text-xs text-muted-foreground">{t.artist}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {previewId === t.id ? '▶' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {value ? (
        <div className="flex gap-2">
          {(['minimal', 'album', 'lyrics'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={cn(
                'rounded-full px-2 py-1 text-xs',
                value.displayMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
              onClick={() => onChange({ ...value, displayMode: mode })}
            >
              {mode === 'minimal' ? 'مینیمال' : mode === 'album' ? 'آلبوم' : 'متن'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
