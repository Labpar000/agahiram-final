'use client';

import { AdSlot } from '@agahiram/shared';
import { cn } from '@agahiram/shared';
import { AD_SLOT_INFO } from '../lib/ads-utils';

type Props = {
  value: AdSlot;
  onChange: (slot: AdSlot) => void;
  previewUrl?: string;
};

const SLOTS = [AdSlot.EXPLORE_FEED, AdSlot.STORY, AdSlot.BANNER] as const;

export function AdSlotPicker({ value, onChange, previewUrl }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {SLOTS.map((slot) => {
          const info = AD_SLOT_INFO[slot];
          const selected = value === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onChange(slot)}
              className={cn(
                'rounded-xl border p-3 text-start transition-colors',
                selected
                  ? 'border-brand bg-brand/5 ring-1 ring-brand'
                  : 'border-border hover:bg-muted/40',
              )}
            >
              <div className="font-medium text-sm">{info.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{info.description}</div>
              <div className="text-[10px] text-muted-foreground mt-1">نسبت {info.aspectRatio}</div>
            </button>
          );
        })}
      </div>
      {previewUrl ? (
        <div className={cn(AD_SLOT_INFO[value].aspectClass, 'relative')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="پیش‌نمایش" className="size-full object-cover" />
        </div>
      ) : null}
    </div>
  );
}
