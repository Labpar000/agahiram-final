'use client';

import { IgClose } from '@agahiram/ui';
import type { Filters } from '../types';

const SORT_LABELS: Record<string, string> = {
  newest: 'جدیدترین',
  cheapest: 'ارزان‌ترین',
  mostExpensive: 'گران‌ترین',
  mostViewed: 'پربازدید',
  nearest: 'نزدیک‌ترین',
  relevance: 'مرتبط‌ترین',
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  fixed: 'قیمت مقطوع',
  negotiable: 'توافقی',
  free: 'رایگان',
  callForPrice: 'تماس بگیرید',
};

type Chip = { key: string; label: string; onRemove: () => void };

function buildChips(filters: Filters, onChange: (next: Filters) => void): Chip[] {
  const chips: Chip[] = [];

  if (filters.categoryName || filters.categoryId) {
    chips.push({
      key: 'category',
      label: filters.categoryName ?? 'دسته',
      onRemove: () =>
        onChange({
          ...filters,
          categoryId: undefined,
          categoryName: undefined,
          attributes: undefined,
        }),
    });
  }

  if (filters.cityName || filters.cityId) {
    chips.push({
      key: 'city',
      label: filters.cityName ?? 'شهر',
      onRemove: () =>
        onChange({
          ...filters,
          cityId: undefined,
          cityName: undefined,
          neighborhoodId: undefined,
          neighborhoodName: undefined,
        }),
    });
  } else if (filters.provinceName || filters.provinceId) {
    chips.push({
      key: 'province',
      label: filters.provinceName ?? 'استان',
      onRemove: () =>
        onChange({
          ...filters,
          provinceId: undefined,
          provinceName: undefined,
        }),
    });
  }

  if (filters.neighborhoodName || filters.neighborhoodId) {
    chips.push({
      key: 'neighborhood',
      label: filters.neighborhoodName ?? 'محله',
      onRemove: () =>
        onChange({
          ...filters,
          neighborhoodId: undefined,
          neighborhoodName: undefined,
        }),
    });
  }

  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      key: 'price',
      label: [
        filters.minPrice ? `از ${filters.minPrice.toLocaleString('fa-IR')}` : null,
        filters.maxPrice ? `تا ${filters.maxPrice.toLocaleString('fa-IR')}` : null,
      ]
        .filter(Boolean)
        .join(' '),
      onRemove: () => onChange({ ...filters, minPrice: undefined, maxPrice: undefined }),
    });
  }

  if (filters.priceType) {
    chips.push({
      key: 'priceType',
      label: PRICE_TYPE_LABELS[filters.priceType] ?? filters.priceType,
      onRemove: () => onChange({ ...filters, priceType: undefined }),
    });
  }

  if (filters.onlyImage) {
    chips.push({
      key: 'onlyImage',
      label: 'فقط عکس',
      onRemove: () => onChange({ ...filters, onlyImage: undefined }),
    });
  }
  if (filters.onlyVideo) {
    chips.push({
      key: 'onlyVideo',
      label: 'فقط ویدئو',
      onRemove: () => onChange({ ...filters, onlyVideo: undefined }),
    });
  }
  if (filters.onlyPromoted) {
    chips.push({
      key: 'onlyPromoted',
      label: 'نردبان‌شده',
      onRemove: () => onChange({ ...filters, onlyPromoted: undefined }),
    });
  }

  if (filters.sortBy) {
    chips.push({
      key: 'sortBy',
      label: SORT_LABELS[filters.sortBy] ?? filters.sortBy,
      onRemove: () => onChange({ ...filters, sortBy: undefined, lat: undefined, lng: undefined }),
    });
  }

  if (filters.attributes) {
    for (const [key, value] of Object.entries(filters.attributes)) {
      chips.push({
        key: `attr-${key}`,
        label: `${key}: ${value}`,
        onRemove: () => {
          const next = { ...filters.attributes };
          delete next[key];
          onChange({
            ...filters,
            attributes: Object.keys(next).length ? next : undefined,
          });
        },
      });
    }
  }

  return chips;
}

export function SearchActiveChips({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const chips = buildChips(filters, onChange);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1 pb-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground tap-none"
        >
          <span>{chip.label}</span>
          <IgClose className="size-3" strokeWidth={1.75} aria-hidden />
        </button>
      ))}
    </div>
  );
}
