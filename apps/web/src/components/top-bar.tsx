'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, Moon, Sun, X } from 'lucide-react';
import type { SearchSuggestionItem } from '@agahiram/shared';
import { formatPersianNumber, normalizePersianText } from '@agahiram/shared';
import { IgDirect, IgSearch, Input, useTheme } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useUnreadMessages, useUnreadNotifications } from '@/hooks/useUnreadCounts';

const RECENT_KEY = 'agahiram_recent_searches';

export function TopBar() {
  const router = useRouter();
  const notifUnread = useUnreadNotifications();
  const msgUnread = useUnreadMessages();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter((v): v is string => typeof v === 'string').slice(0, 10));
      }
    } catch {
      setRecent([]);
    }
  }, []);

  const suggestionsQuery = useQuery({
    queryKey: ['search', 'suggestions', debounced],
    queryFn: async () => {
      const r = await apiClient.get<{ suggestions: SearchSuggestionItem[] }>(
        '/search/suggestions',
        {
          q: debounced,
          limit: 8,
        },
      );
      return r.data?.suggestions ?? [];
    },
    enabled: searchOpen && debounced.length >= 2,
    staleTime: 30_000,
  });

  const suggestions = suggestionsQuery.data ?? [];
  const shownRecents = useMemo(
    () =>
      recent.filter((item) =>
        debounced ? normalizePersianText(item).includes(normalizePersianText(debounced)) : true,
      ),
    [recent, debounced],
  );

  const submitSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    const updated = [term, ...recent.filter((v) => v !== term)].slice(0, 8);
    setRecent(updated);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      /* ignore storage errors */
    }
    setSearchOpen(false);
    setSearchText('');
    router.push(`/explore?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface pt-safe">
      <div className="mx-auto flex h-[var(--header-height)] max-w-2xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link
          href="/feed"
          aria-label="آگهی‌گرام — صفحه اصلی"
          className="min-w-0 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span className="truncate text-xl font-semibold leading-none tracking-tight text-foreground">
            آگهی‌گرام
          </span>
        </Link>

        <div className="flex shrink-0 items-center">
          <HeaderIconButton
            label="جستجو"
            onClick={() => setSearchOpen(true)}
            icon={<IgSearch className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
          />
          <ThemeButton />
          <HeaderIconLink
            href="/notifications"
            label="اعلان‌ها"
            badge={notifUnread}
            icon={<Bell className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
          />
          <HeaderIconLink
            href="/messages"
            label="پیام‌ها"
            badge={msgUnread}
            icon={<IgDirect className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
          />
        </div>
      </div>
      {searchOpen ? (
        <div className="absolute inset-x-0 top-full border-b border-border bg-surface shadow-sm">
          <div className="mx-auto max-w-2xl px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  autoFocus
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitSearch(searchText);
                    }
                  }}
                  placeholder="جستجو در آگهی‌ها…"
                  leadingIcon={<IgSearch className="size-4" strokeWidth={1.75} aria-hidden />}
                  aria-label="جستجو"
                />
              </div>
              <HeaderIconButton
                label="بستن جستجو"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchText('');
                }}
                icon={<X className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
              />
            </div>

            <div className="mt-2 max-h-72 overflow-y-auto">
              {debounced.length >= 2 ? (
                suggestions.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">پیشنهادی پیدا نشد.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {suggestions.map((s, i) => (
                      <li key={`${s.text}-${i}`}>
                        <button
                          type="button"
                          onClick={() => submitSearch(s.text)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition hover:bg-muted"
                        >
                          <span className="truncate">{s.text}</span>
                          <IgSearch
                            className="size-3.5 text-muted-foreground"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : shownRecents.length > 0 ? (
                <>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    جستجوهای اخیر
                  </p>
                  <ul className="space-y-0.5">
                    {shownRecents.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => submitSearch(item)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition hover:bg-muted"
                        >
                          <span className="truncate">{item}</span>
                          <IgSearch
                            className="size-3.5 text-muted-foreground"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  عبارت مورد نظر را تایپ کنید (حداقل ۲ کاراکتر).
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

const headerIconClass =
  'grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;
  return (
    <button
      type="button"
      aria-label={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={headerIconClass}
    >
      {isDark ? (
        <Sun className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

function HeaderIconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={headerIconClass}>
      {icon}
    </button>
  );
}

function HeaderIconLink({
  href,
  label,
  badge,
  icon,
}: {
  href: string;
  label: string;
  badge: number;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={badge > 0 ? `${label} (${formatPersianNumber(badge)} مورد جدید)` : label}
      className={`relative ${headerIconClass}`}
    >
      {icon}
      {badge > 0 ? (
        <span
          aria-hidden
          className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-surface"
        >
          {badge > 9 ? '۹+' : formatPersianNumber(badge)}
        </span>
      ) : null}
    </Link>
  );
}
