'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IgArrowBack,
  IgCheck,
  IgChevron,
  IgClose,
  IgLocation,
  IgSearch,
  IgSliders,
} from '@agahiram/ui';
import { cn, formatPersianNumber, normalizePersianText } from '@agahiram/shared';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  ScrollArea,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

/* ──────────────────────────── Types & filter shape ────────────────────────── */

export interface Filters {
  categoryId?: string;
  categoryName?: string;
  cityId?: string;
  cityName?: string;
  provinceId?: string;
  provinceName?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'newest' | 'cheapest' | 'mostExpensive' | 'mostViewed' | 'nearest' | 'relevance';
  onlyImage?: boolean;
  onlyVideo?: boolean;
  onlyPromoted?: boolean;
  lat?: number;
  lng?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  icon?: string | null;
  emoji?: string | null;
  children?: Category[];
}

interface Province {
  id: string;
  name: string;
  slug: string;
}

interface City {
  id: string;
  name: string;
  slug: string;
  provinceId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Filters;
  onApply: (f: Filters) => void;
}

const SORT_OPTIONS = [
  { v: 'newest', l: 'جدیدترین' },
  { v: 'cheapest', l: 'ارزان‌ترین' },
  { v: 'mostExpensive', l: 'گران‌ترین' },
  { v: 'mostViewed', l: 'پربازدید' },
  { v: 'relevance', l: 'مرتبط‌ترین' },
  { v: 'nearest', l: 'نزدیک‌ترین' },
] as const;

type Step = 'main' | 'category' | 'location';

/* ───────────────────────────────── Component ──────────────────────────────── */

export function SearchFiltersSheet({ open, onOpenChange, filters, onApply }: Props) {
  const [local, setLocal] = useState<Filters>(filters);
  const [step, setStep] = useState<Step>('main');
  useEffect(() => {
    if (open) {
      setLocal(filters);
      setStep('main');
    }
  }, [open, filters]);

  const activeCount = useMemo(
    () =>
      [
        local.categoryId,
        local.cityId ?? local.provinceId,
        local.minPrice,
        local.maxPrice,
        local.sortBy,
        local.onlyImage,
        local.onlyVideo,
        local.onlyPromoted,
      ].filter(Boolean).length,
    [local],
  );

  const handleApply = async () => {
    if (
      local.sortBy === 'nearest' &&
      (typeof local.lat !== 'number' || typeof local.lng !== 'number') &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60_000,
          });
        });
        const withGeo = {
          ...local,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocal(withGeo);
        onApply(withGeo);
        onOpenChange(false);
        return;
      } catch {
        toast.error('برای مرتب‌سازی نزدیک‌ترین، دسترسی موقعیت مکانی لازم است.');
        return;
      }
    }
    onApply(local);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocal({});
  };

  const headerTitle =
    step === 'category' ? 'انتخاب دسته‌بندی' : step === 'location' ? 'انتخاب موقعیت' : 'فیلترها';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="overflow-hidden"
        style={{
          maxHeight: 'calc(100svh - var(--header-height) - var(--safe-top))',
        }}
      >
        <DrawerHeader className="flex items-center justify-between gap-3 border-b border-border bg-surface/95 backdrop-blur">
          <DrawerTitle className="inline-flex items-center gap-2">
            {step !== 'main' ? (
              <button
                type="button"
                onClick={() => setStep('main')}
                aria-label="بازگشت"
                className="-ms-2 grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IgArrowBack className="size-5 rtl:scale-x-[-1]" strokeWidth={1.75} aria-hidden />
              </button>
            ) : (
              <IgSliders className="size-5 text-foreground" strokeWidth={1.75} aria-hidden />
            )}
            <span>{headerTitle}</span>
            {step === 'main' && activeCount > 0 ? (
              <span className="ms-1 grid h-5 min-w-5 place-items-center rounded-full bg-ig-link px-1.5 text-[11px] font-bold text-ig-link-foreground">
                {formatPersianNumber(activeCount)}
              </span>
            ) : null}
          </DrawerTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="بستن"
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IgClose className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </DrawerHeader>

        <DrawerBody className="p-0">
          {step === 'main' && (
            <MainStep
              local={local}
              setLocal={setLocal}
              onOpenCategory={() => setStep('category')}
              onOpenLocation={() => setStep('location')}
            />
          )}
          {step === 'category' && (
            <CategoryPicker
              currentId={local.categoryId}
              onPick={(c) => {
                setLocal((s) => ({ ...s, categoryId: c.id, categoryName: c.name }));
                setStep('main');
              }}
              onClear={() => {
                setLocal((s) => ({ ...s, categoryId: undefined, categoryName: undefined }));
                setStep('main');
              }}
            />
          )}
          {step === 'location' && (
            <CityLocationPicker
              currentCityId={local.cityId}
              currentProvinceId={local.provinceId}
              currentCityName={local.cityName}
              currentProvinceName={local.provinceName}
              onPickProvince={(p) => {
                setLocal((s) => ({
                  ...s,
                  provinceId: p.id,
                  provinceName: p.name,
                  cityId: undefined,
                  cityName: undefined,
                }));
              }}
              onPickCity={(c, p) => {
                setLocal((s) => ({
                  ...s,
                  provinceId: p.id,
                  provinceName: p.name,
                  cityId: c.id,
                  cityName: c.name,
                }));
                setStep('main');
              }}
              onPickProvinceOnly={(p) => {
                setLocal((s) => ({
                  ...s,
                  provinceId: p.id,
                  provinceName: p.name,
                  cityId: undefined,
                  cityName: undefined,
                }));
                setStep('main');
              }}
              onClear={() => {
                setLocal((s) => ({
                  ...s,
                  provinceId: undefined,
                  provinceName: undefined,
                  cityId: undefined,
                  cityName: undefined,
                }));
                setStep('main');
              }}
            />
          )}
        </DrawerBody>

        {step === 'main' ? (
          <DrawerFooter className="border-t border-border bg-surface/95 backdrop-blur">
            <div className="flex gap-2">
              <Button variant="outline" size="lg" fullWidth onClick={handleClear}>
                پاک کردن همه
              </Button>
              <Button className="btn-ig-link" size="lg" fullWidth onClick={handleApply}>
                اعمال فیلتر
              </Button>
            </div>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

/* ─────────────────────────────── Step: main ──────────────────────────────── */

function MainStep({
  local,
  setLocal,
  onOpenCategory,
  onOpenLocation,
}: {
  local: Filters;
  setLocal: React.Dispatch<React.SetStateAction<Filters>>;
  onOpenCategory: () => void;
  onOpenLocation: () => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4 pb-6">
        {/* Category picker row */}
        <PickerRow
          label="دسته‌بندی"
          value={local.categoryName ?? 'همه دسته‌ها'}
          isActive={Boolean(local.categoryId)}
          onClear={
            local.categoryId
              ? () => setLocal((s) => ({ ...s, categoryId: undefined, categoryName: undefined }))
              : undefined
          }
          onClick={onOpenCategory}
        />

        {/* Location picker row */}
        <PickerRow
          label="موقعیت"
          icon={<IgLocation className="size-4 text-ig-link" strokeWidth={1.75} aria-hidden />}
          value={
            local.cityName
              ? `${local.provinceName ? `${local.provinceName} — ` : ''}${local.cityName}`
              : (local.provinceName ?? 'سراسر کشور')
          }
          isActive={Boolean(local.cityId ?? local.provinceId)}
          onClear={
            local.cityId || local.provinceId
              ? () =>
                  setLocal((s) => ({
                    ...s,
                    provinceId: undefined,
                    provinceName: undefined,
                    cityId: undefined,
                    cityName: undefined,
                  }))
              : undefined
          }
          onClick={onOpenLocation}
        />

        {/* Price range */}
        <div className="space-y-2.5">
          <Label>بازه قیمت (تومان)</Label>
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              aria-label="حداقل قیمت"
              type="number"
              inputMode="numeric"
              value={local.minPrice ?? ''}
              onChange={(e) =>
                setLocal((s) => ({
                  ...s,
                  minPrice: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="حداقل"
            />
            <Input
              aria-label="حداکثر قیمت"
              type="number"
              inputMode="numeric"
              value={local.maxPrice ?? ''}
              onChange={(e) =>
                setLocal((s) => ({
                  ...s,
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="حداکثر"
            />
          </div>
          <PriceChips
            onPick={(min, max) => setLocal((s) => ({ ...s, minPrice: min, maxPrice: max }))}
          />
        </div>

        {/* Sort */}
        <div className="space-y-2.5">
          <Label>مرتب‌سازی</Label>
          <div className="grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map((o) => (
              <ToggleChip
                key={o.v}
                active={local.sortBy === o.v}
                onClick={() =>
                  setLocal((s) => ({
                    ...s,
                    sortBy: s.sortBy === o.v ? undefined : (o.v as Filters['sortBy']),
                  }))
                }
              >
                {o.l}
              </ToggleChip>
            ))}
          </div>
        </div>

        {/* Quick toggles */}
        <div className="space-y-2.5">
          <Label>گزینه‌ها</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ToggleChip
              active={Boolean(local.onlyImage)}
              onClick={() => setLocal((s) => ({ ...s, onlyImage: !s.onlyImage, onlyVideo: false }))}
            >
              فقط دارای عکس
            </ToggleChip>
            <ToggleChip
              active={Boolean(local.onlyVideo)}
              onClick={() => setLocal((s) => ({ ...s, onlyVideo: !s.onlyVideo, onlyImage: false }))}
            >
              فقط دارای ویدئو
            </ToggleChip>
            <ToggleChip
              active={Boolean(local.onlyPromoted)}
              onClick={() => setLocal((s) => ({ ...s, onlyPromoted: !s.onlyPromoted }))}
            >
              فقط نردبان‌شده
            </ToggleChip>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

/* ───────────────────────── Step: category drill-down ─────────────────────── */

function CategoryPicker({
  currentId,
  onPick,
  onClear,
}: {
  currentId?: string;
  onPick: (c: { id: string; name: string }) => void;
  onClear: () => void;
}) {
  const [path, setPath] = useState<Category[]>([]);
  const [q, setQ] = useState('');

  const { data: tree, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const r = await apiClient.get<Category[]>('/categories/tree');
      return r.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return null;
    const lower = q.trim().toLowerCase();
    const flat: Array<Category & { parentName?: string }> = [];
    const walk = (items: Category[], parents: string[]) => {
      for (const item of items) {
        if (item.name.toLowerCase().includes(lower)) {
          flat.push({ ...item, parentName: parents.join(' / ') || undefined });
        }
        walk(item.children ?? [], [...parents, item.name]);
      }
    };
    walk(tree ?? [], []);
    return flat;
  }, [q, tree]);

  const parent = path[path.length - 1] ?? null;
  const visible = parent?.children?.length ? parent.children : (tree ?? []);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-surface/95 p-3 backdrop-blur-md">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی دسته‌بندی…"
          leadingIcon={<IgSearch className="size-4" strokeWidth={1.75} aria-hidden />}
          aria-label="جستجوی دسته‌بندی"
        />
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors tap-none',
            !currentId
              ? 'bg-ig-link text-ig-link-foreground'
              : 'border border-input text-muted-foreground hover:bg-muted',
          )}
        >
          همه دسته‌ها
          {!currentId ? <IgCheck className="size-3.5" strokeWidth={1.75} aria-hidden /> : null}
        </button>
      </div>

      <ScrollArea className="h-full">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : filtered ? (
            <ul className="space-y-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  دسته‌ای پیدا نشد.
                </li>
              ) : (
                filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onPick({ id: c.id, name: c.name })}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-muted tap-none"
                    >
                      <span className="truncate">{c.name}</span>
                      {c.parentName ? (
                        <span className="ms-2 text-xs text-muted-foreground">{c.parentName}</span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : parent ? (
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setPath((p) => p.slice(0, -1))}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-xs text-muted-foreground transition-colors hover:bg-muted tap-none"
                >
                  <IgChevron
                    direction="left"
                    className="size-4 rtl:scale-x-[-1]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  بازگشت
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onPick({ id: parent.id, name: parent.name })}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-sm font-semibold transition-colors hover:bg-muted tap-none',
                    currentId === parent.id && 'bg-accent text-accent-foreground',
                  )}
                >
                  <span>همه «{parent.name}»</span>
                  {currentId === parent.id ? (
                    <IgCheck className="size-4 text-ig-link" strokeWidth={1.75} aria-hidden />
                  ) : null}
                </button>
              </li>
              {(parent.children ?? []).map((child) => {
                const hasChildren = !!child.children?.length;
                return (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (hasChildren) setPath((p) => [...p, child]);
                        else onPick({ id: child.id, name: child.name });
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-sm transition-colors hover:bg-muted tap-none',
                        currentId === child.id && 'bg-accent text-accent-foreground',
                      )}
                    >
                      <span>{child.name}</span>
                      {hasChildren ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {formatPersianNumber(child.children!.length)} زیرشاخه
                          <IgChevron
                            direction="left"
                            className="size-3.5 rtl:scale-x-[-1]"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </span>
                      ) : currentId === child.id ? (
                        <IgCheck className="size-4 text-ig-link" strokeWidth={1.75} aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-1">
              {visible.map((root) => (
                <li key={root.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (root.children && root.children.length > 0) setPath((p) => [...p, root]);
                      else onPick({ id: root.id, name: root.name });
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-muted tap-none"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="text-base">
                        {(root as { emoji?: string }).emoji ?? '🗂'}
                      </span>
                      {root.name}
                    </span>
                    {root.children && root.children.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {formatPersianNumber(root.children.length)} زیرشاخه
                        <IgChevron
                          direction="left"
                          className="size-3.5 rtl:scale-x-[-1]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ───────────────────── Step: province → city cascade ─────────────────────── */

export function CityLocationPicker({
  currentCityId,
  currentProvinceId,
  currentCityName,
  currentProvinceName,
  onPickProvince,
  onPickCity,
  onPickProvinceOnly,
  onClear,
  embedded = false,
}: {
  currentCityId?: string;
  currentProvinceId?: string;
  currentCityName?: string;
  currentProvinceName?: string;
  onPickProvince: (p: Province) => void;
  onPickCity: (c: City, p: Province) => void;
  onPickProvinceOnly: (p: Province) => void;
  onClear: () => void;
  /** Collapse to a summary row after city pick (create/ad post flow). */
  embedded?: boolean;
}) {
  const [provincePicked, setProvincePicked] = useState<Province | null>(null);
  const [q, setQ] = useState('');
  const [listOpen, setListOpen] = useState(() => !embedded || !currentCityId);
  const userOpenedListRef = useRef(false);

  const { data: provinces, isLoading: provincesLoading } = useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const r = await apiClient.get<Province[]>('/locations/provinces');
      return r.data ?? [];
    },
  });

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', provincePicked?.id],
    queryFn: async () => {
      if (!provincePicked) return [] as City[];
      const r = await apiClient.get<City[]>(`/locations/provinces/${provincePicked.id}/cities`);
      return r.data ?? [];
    },
    enabled: Boolean(provincePicked),
  });

  const { data: cityDetails } = useQuery({
    queryKey: ['city-detail', currentCityId],
    queryFn: async () => {
      const r = await apiClient.get<City & { province: Province }>(
        `/locations/city/${currentCityId}`,
      );
      return r.data ?? null;
    },
    enabled: embedded && !listOpen && !!currentCityId && !currentCityName,
  });

  /* Live search: hit the global city search endpoint when q has ≥2 chars and no province is picked */
  const { data: searchHits } = useQuery({
    queryKey: ['city-search', q],
    queryFn: async () => {
      const r = await apiClient.get<Array<City & { province: Province }>>('/locations/search', {
        q,
      });
      return r.data ?? [];
    },
    enabled: !provincePicked && q.trim().length >= 2,
  });

  const filteredProvinces = useMemo(() => {
    if (provincePicked || !q.trim()) return provinces ?? [];
    const lower = normalizePersianText(q.trim());
    return (provinces ?? []).filter((p) => normalizePersianText(p.name).includes(lower));
  }, [provinces, provincePicked, q]);

  const filteredCities = useMemo(() => {
    if (!provincePicked) return [];
    if (!q.trim()) return cities ?? [];
    const lower = normalizePersianText(q.trim());
    return (cities ?? []).filter((c) => normalizePersianText(c.name).includes(lower));
  }, [cities, provincePicked, q]);

  const selectedLabel = useMemo(() => {
    if (currentCityName) {
      return currentProvinceName ? `${currentProvinceName} — ${currentCityName}` : currentCityName;
    }
    if (cityDetails) {
      return `${cityDetails.province.name} — ${cityDetails.name}`;
    }
    if (currentProvinceName && !currentCityId) return currentProvinceName;
    return 'سراسر کشور';
  }, [currentCityName, currentProvinceName, currentCityId, cityDetails]);

  const resetList = () => {
    setProvincePicked(null);
    setQ('');
  };

  const closeList = () => {
    if (!embedded) return;
    userOpenedListRef.current = false;
    setListOpen(false);
    resetList();
  };

  useEffect(() => {
    if (embedded && currentCityId && !userOpenedListRef.current) {
      setListOpen(false);
      resetList();
    }
  }, [embedded, currentCityId]);

  const handlePickCity = (c: City, p: Province) => {
    onPickCity(c, p);
    closeList();
  };

  const handlePickProvinceOnly = (p: Province) => {
    onPickProvinceOnly(p);
    closeList();
  };

  const handleClear = () => {
    onClear();
    if (embedded) {
      userOpenedListRef.current = true;
      setListOpen(true);
      resetList();
    }
  };

  const openProvince = (p: Province) => {
    onPickProvince(p);
    setProvincePicked(p);
    setQ('');
  };

  if (embedded && !listOpen && currentCityId) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            userOpenedListRef.current = true;
            setListOpen(true);
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-input bg-surface px-3.5 py-3.5 text-start shadow-xs transition-colors hover:bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-ig-link">
            <IgLocation className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">شهر آگهی</span>
            <span className="block truncate font-semibold text-foreground">{selectedLabel}</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-ig-link">تغییر</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col',
        embedded ? 'max-h-[min(20rem,60svh)]' : 'h-full min-h-0 flex-1',
      )}
    >
      <div className="shrink-0 border-b border-border bg-surface/95 p-3">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            provincePicked ? `جستجوی شهر در ${provincePicked.name}…` : 'جستجوی استان یا شهر…'
          }
          leadingIcon={<IgSearch className="size-4" strokeWidth={1.75} aria-hidden />}
          aria-label="جستجوی موقعیت"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors tap-none',
              !currentCityId && !currentProvinceId
                ? 'bg-ig-link text-ig-link-foreground'
                : 'border border-input text-muted-foreground hover:bg-muted',
            )}
          >
            سراسر کشور
            {!currentCityId && !currentProvinceId ? (
              <IgCheck className="size-3.5" strokeWidth={1.75} aria-hidden />
            ) : null}
          </button>
          {provincePicked ? (
            <button
              type="button"
              onClick={resetList}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted tap-none"
            >
              <IgChevron
                direction="left"
                className="size-3.5 rtl:scale-x-[-1]"
                strokeWidth={1.75}
                aria-hidden
              />
              بازگشت به استان‌ها
            </button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {!provincePicked && searchHits && searchHits.length > 0 ? (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                نتایج جستجوی شهر
              </p>
              <ul className="space-y-1">
                {searchHits.map((hit) => (
                  <LocationListItem
                    key={hit.id}
                    label={hit.name}
                    sublabel={hit.province.name}
                    isSelected={currentCityId === hit.id}
                    onClick={() => handlePickCity(hit, hit.province)}
                  />
                ))}
              </ul>
              <hr className="my-2 border-border" />
            </>
          ) : null}

          {!provincePicked ? (
            provincesLoading ? (
              <SkeletonRows />
            ) : (provinces ?? []).length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                لیست استان‌ها در دسترس نیست. لطفاً چند لحظه بعد دوباره تلاش کنید.
              </p>
            ) : filteredProvinces.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                استانی پیدا نشد.
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredProvinces.map((p) => (
                  <LocationListItem
                    key={p.id}
                    label={p.name}
                    isSelected={currentProvinceId === p.id && !currentCityId}
                    trailing={
                      <IgChevron
                        direction="left"
                        className="size-4 shrink-0 text-muted-foreground rtl:scale-x-[-1]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    }
                    onClick={() => openProvince(p)}
                  />
                ))}
              </ul>
            )
          ) : citiesLoading ? (
            <SkeletonRows />
          ) : (
            <ul className="space-y-1">
              <LocationListItem
                label={`کل استان ${provincePicked.name}`}
                isSelected={currentProvinceId === provincePicked.id && !currentCityId}
                onClick={() => handlePickProvinceOnly(provincePicked)}
                className="font-semibold"
              />
              {filteredCities.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  شهری پیدا نشد.
                </li>
              ) : (
                filteredCities.map((c) => (
                  <LocationListItem
                    key={c.id}
                    label={c.name}
                    isSelected={currentCityId === c.id}
                    onClick={() => handlePickCity(c, provincePicked)}
                  />
                ))
              )}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─────────────────────────────── Sub-bits ────────────────────────────────── */

function PickerRow({
  label,
  value,
  icon,
  isActive,
  onClick,
  onClear,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex flex-1 items-center justify-between gap-2 rounded-xl border bg-surface px-3.5 py-3 text-start text-sm shadow-xs transition-[background-color,border-color,box-shadow] tap-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            isActive
              ? 'border-primary bg-accent/50 text-foreground'
              : 'border-input text-muted-foreground hover:bg-muted',
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            {icon}
            <span className={cn('truncate', isActive && 'font-semibold text-foreground')}>
              {value}
            </span>
          </span>
          <IgChevron
            direction="left"
            className="size-4 shrink-0 text-muted-foreground rtl:scale-x-[-1]"
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={`حذف ${label}`}
            className="grid w-11 place-items-center rounded-xl border border-input text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <IgClose className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-11 rounded-xl border px-3 text-sm font-medium shadow-xs transition-[background-color,border-color,color] tap-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-input text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function PriceChips({ onPick }: { onPick: (min?: number, max?: number) => void }) {
  const chips: Array<{ l: string; min?: number; max?: number }> = [
    { l: 'تا ۵ میلیون', max: 5_000_000 },
    { l: '۵ تا ۲۰ میلیون', min: 5_000_000, max: 20_000_000 },
    { l: '۲۰ تا ۱۰۰ میلیون', min: 20_000_000, max: 100_000_000 },
    { l: '۱۰۰ میلیون تا ۱ میلیارد', min: 100_000_000, max: 1_000_000_000 },
    { l: 'بیشتر از ۱ میلیارد', min: 1_000_000_000 },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.l}
          type="button"
          onClick={() => onPick(c.min, c.max)}
          className="rounded-full border border-input px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {c.l}
        </button>
      ))}
    </div>
  );
}

function LocationListItem({
  label,
  sublabel,
  isSelected,
  trailing,
  onClick,
  className,
}: {
  label: string;
  sublabel?: string;
  isSelected?: boolean;
  trailing?: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-3 text-start text-sm transition-colors hover:bg-muted active:bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSelected && 'bg-accent text-accent-foreground',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', sublabel && 'font-medium')}>{label}</span>
        {trailing ??
          (sublabel ? (
            <span className="shrink-0 text-xs text-muted-foreground">{sublabel}</span>
          ) : isSelected ? (
            <IgCheck className="size-4 shrink-0 text-ig-link" strokeWidth={1.75} aria-hidden />
          ) : null)}
      </button>
    </li>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
