'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IgGrid2x2, IgLayoutGrid, IgPlus, Button } from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import { compositeLayoutCollage } from '../story-media-utils';
import type { CapturedMedia } from './story-camera';

const LAYOUTS = [
  { n: 2 as const, label: '۲', icon: IgGrid2x2 },
  { n: 3 as const, label: '۳', icon: IgLayoutGrid },
  { n: 4 as const, label: '۴', icon: IgLayoutGrid },
  { n: 6 as const, label: '۶', icon: IgLayoutGrid },
];

export function StoryLayoutCollage({
  onDone,
  onCancel,
}: {
  onDone: (media: CapturedMedia) => void;
  onCancel: () => void;
}) {
  const [layout, setLayout] = useState<2 | 3 | 4 | 6>(2);
  const [cells, setCells] = useState<Array<{ url: string; type: 'image' }>>([]);
  const [busy, setBusy] = useState(false);

  const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setCells((prev) => {
        if (prev.length >= layout) return prev;
        return [...prev, { url, type: 'image' }];
      });
    };
    input.click();
  };

  const compose = async () => {
    if (cells.length < 2) return;
    setBusy(true);
    try {
      const { blob, url } = await compositeLayoutCollage(cells, layout);
      onDone({ blob, url, type: 'image' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">چیدمان کلاژ — تا {layout} تصویر</p>
      <div className="flex gap-2">
        {LAYOUTS.map(({ n, label }) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setLayout(n);
              setCells((c) => c.slice(0, n));
            }}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium',
              layout === n ? 'border-primary bg-accent' : 'border-border',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          'grid aspect-[9/16] gap-1 overflow-hidden rounded-2xl bg-black p-1',
          layout === 2 && 'grid-rows-2 grid-cols-1',
          layout === 3 && 'grid-rows-2 grid-cols-2 [&>*:first-child]:col-span-2',
          layout === 4 && 'grid-cols-2 grid-rows-2',
          layout === 6 && 'grid-cols-2 grid-rows-3',
        )}
      >
        {Array.from({ length: layout }).map((_, i) => {
          const cell = cells[i];
          return (
            <button
              key={i}
              type="button"
              onClick={pickImage}
              className="relative min-h-0 overflow-hidden rounded-lg bg-neutral-800"
            >
              {cell ? (
                <Image src={cell.url} alt="" fill className="object-cover" sizes="200px" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-white/60">
                  <IgPlus className="size-8" strokeWidth={1.75} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" fullWidth onClick={onCancel}>
          لغو
        </Button>
        <Button
          variant="brand"
          fullWidth
          isLoading={busy}
          disabled={cells.length < 2}
          onClick={() => void compose()}
        >
          ادامه
        </Button>
      </div>
    </div>
  );
}
