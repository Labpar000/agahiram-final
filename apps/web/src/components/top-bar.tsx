'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { SearchSuggestionItem } from '@agahiram/shared';
import { formatPersianNumber, normalizePersianText } from '@agahiram/shared';
import {
  IgBell,
  IgClose,
  IgDirect,
  IgHeaderBadge,
  IgMoon,
  IgSearch,
  IgSun,
  IgTopNav,
  IgWordmark,
  Input,
  igHeaderIconClass,
  useTheme,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useUnreadMessages, useUnreadNotifications } from '@/hooks/useUnreadCounts';
import { isImmersiveStoryViewerRoute } from '@/lib/story-viewer-routes';

const RECENT_KEY = 'agahiram_recent_searches';

export function TopBar() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const hideOnReels = pathname === '/reels';
  const hideOnStoryViewer = isImmersiveStoryViewerRoute(pathname);
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
        { q: debounced, limit: 8 },
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

  if (hideOnReels || hideOnStoryViewer) return null;

  return (
    <>
      <IgTopNav
        brand={
          <Link
            href="/feed"
            aria-label="آگهی‌گرام — صفحه اصلی"
            className="inline-flex min-w-0 items-center gap-2 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <IgWordmark>Agahiram</IgWordmark>
          </Link>
        }
        actions={
          <>
            <HeaderIconButton
              label="جستجو"
              onClick={() => {
                if (searchOpen && searchText.trim()) {
                  submitSearch(searchText);
                } else {
                  setSearchOpen(true);
                }
              }}
              icon={<IgSearch className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
            />
            <ThemeButton />
            <HeaderIconLink
              href="/notifications"
              label="اعلان‌ها"
              badge={notifUnread}
              icon={
                <IgBell
                  className="size-[var(--ig-icon)]"
                  filled={notifUnread > 0}
                  strokeWidth={1.75}
                  aria-hidden
                />
              }
            />
            <HeaderIconLink
              href="/messages"
              label="پیام‌ها"
              badge={msgUnread}
              icon={<IgDirect className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
            />
          </>
        }
      />

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-surface">
          <div className="glass border-b border-border-subtle pt-safe">
            <div className="mx-auto flex h-[var(--header-height)] max-w-2xl items-center gap-2 px-4 py-2">
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
                  placeholder="جستجو"
                  className="h-9 rounded-full border-0 bg-muted text-sm"
                  leadingIcon={
                    searchText.trim() ? (
                      <button
                        type="button"
                        onClick={() => submitSearch(searchText)}
                        className="grid place-items-center tap-none focus-visible:outline-none"
                        aria-label="اجرای جستجو"
                      >
                        <IgSearch className="size-4" strokeWidth={1.75} aria-hidden />
                      </button>
                    ) : (
                      <IgSearch className="size-4" strokeWidth={1.75} aria-hidden />
                    )
                  }
                  aria-label="جستجو"
                />
              </div>
              <HeaderIconButton
                label="بستن جستجو"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchText('');
                }}
                icon={<IgClose className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />}
              />
            </div>
          </div>

          <div className="mx-auto max-w-2xl overflow-y-auto px-3 py-2 sm:px-4">
            {debounced.length >= 2 ? (
              suggestions.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">پیشنهادی پیدا نشد.</p>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {suggestions.map((s, i) => (
                    <li key={`${s.text}-${i}`}>
                      <button
                        type="button"
                        onClick={() => submitSearch(s.text)}
                        className="flex w-full items-center justify-between py-3 text-start text-sm transition hover:bg-muted/50"
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
                <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">اخیر</p>
                <ul className="divide-y divide-border-subtle">
                  {shownRecents.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => submitSearch(item)}
                        className="flex w-full items-center justify-between py-3 text-start text-sm transition hover:bg-muted/50"
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
      ) : null}
    </>
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
      className={igHeaderIconClass}
    >
      {isDark ? (
        <IgSun className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />
      ) : (
        <IgMoon className="size-[var(--ig-icon)]" strokeWidth={1.75} aria-hidden />
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
    <button type="button" aria-label={label} onClick={onClick} className={igHeaderIconClass}>
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
      className={`relative ${igHeaderIconClass}`}
    >
      {icon}
      {badge > 0 ? <IgHeaderBadge /> : null}
    </Link>
  );
}
