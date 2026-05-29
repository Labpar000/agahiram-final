'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, MessageCircle, Moon, Search, Sun, X } from 'lucide-react';
import type { SearchSuggestionItem } from '@agahiram/shared';
import { formatPersianNumber, normalizePersianText } from '@agahiram/shared';
import { Input, useTheme } from '@agahiram/ui';
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
    const t = setTimeout(() => setDebounced(searchText.trim()), 180);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter((v): v is string => typeof v === 'string').slice(0, 8));
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
    <header className="sticky top-0 z-30 glass border-b pt-safe">
      <div className="mx-auto flex h-[var(--header-height)] max-w-2xl items-center justify-between gap-3 px-3.5 sm:px-4">
        <Link
          href="/feed"
          aria-label="آگهی‌گرام"
          className="group inline-flex min-w-0 items-center gap-2 rounded-full tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-xl gradient-brand text-white shadow-sm transition-transform group-hover:scale-105"
          >
            <span className="font-display text-base font-extrabold leading-none">آ</span>
          </span>
          <span className="truncate gradient-text-brand text-lg font-extrabold tracking-tight">
            آگهی‌گرام
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="جستجو"
            className="grid size-11 place-items-center rounded-full text-foreground transition-[background-color,color,transform] hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tap-none"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5" aria-hidden />
          </button>
          <ThemeButton />
          <IconLink
            href="/notifications"
            label="اعلان‌ها"
            badge={notifUnread}
            icon={<Bell className="size-5" aria-hidden />}
          />
          <IconLink
            href="/messages"
            label="پیام‌ها"
            badge={msgUnread}
            icon={<MessageCircle className="size-5" aria-hidden />}
          />
        </div>
      </div>
      {searchOpen ? (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background/98 shadow-md backdrop-blur">
          <div className="mx-auto max-w-2xl px-3.5 py-3 sm:px-4">
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
                  leadingIcon={<Search className="size-4" aria-hidden />}
                  aria-label="جستجو"
                />
              </div>
              <button
                type="button"
                aria-label="بستن جستجو"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchText('');
                }}
                className="grid size-11 place-items-center rounded-full text-foreground transition hover:bg-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="mt-2 max-h-72 overflow-y-auto">
              {debounced.length >= 2 ? (
                suggestions.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">پیشنهادی پیدا نشد.</p>
                ) : (
                  <ul className="space-y-1">
                    {suggestions.map((s, i) => (
                      <li key={`${s.text}-${i}`}>
                        <button
                          type="button"
                          onClick={() => submitSearch(s.text)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm transition hover:bg-muted"
                        >
                          <span className="truncate">{s.text}</span>
                          <Search className="size-3.5 text-muted-foreground" aria-hidden />
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
                  <ul className="space-y-1">
                    {shownRecents.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => submitSearch(item)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm transition hover:bg-muted"
                        >
                          <span className="truncate">{item}</span>
                          <Search className="size-3.5 text-muted-foreground" aria-hidden />
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
      className="grid size-11 place-items-center rounded-full text-foreground transition-[background-color,color,transform] hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tap-none"
    >
      {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

function IconLink({
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
      className="relative grid size-11 place-items-center rounded-full text-foreground transition-[background-color,color,transform] hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tap-none"
    >
      {icon}
      {badge > 0 ? (
        <span
          aria-hidden
          className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-surface"
        >
          {badge > 9 ? '۹+' : formatPersianNumber(badge)}
        </span>
      ) : null}
    </Link>
  );
}
