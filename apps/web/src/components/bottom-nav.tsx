'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { cn, formatPersianNumber } from '@agahiram/shared';
import { IgCreate, IgHome, IgReels, IgSearch, IgUser } from '@agahiram/ui';
import { useUnreadNotifications } from '@/hooks/useUnreadCounts';
import { useAuthStore } from '@/lib/auth-store';

const items = [
  {
    href: '/feed',
    label: 'خانه',
    Icon: IgHome,
    filledWhenActive: true,
    center: false,
    notify: false,
  },
  {
    href: '/explore',
    label: 'جستجو',
    Icon: IgSearch,
    filledWhenActive: true,
    center: false,
    notify: false,
  },
  {
    href: '/create',
    label: 'آگهی',
    Icon: IgCreate,
    filledWhenActive: false,
    center: true,
    notify: false,
  },
  {
    href: '/reels',
    label: 'ریلز',
    Icon: IgReels,
    filledWhenActive: true,
    center: false,
    notify: false,
  },
  {
    href: '/profile',
    label: 'پروفایل',
    Icon: IgUser,
    filledWhenActive: true,
    center: false,
    notify: true,
  },
] as const;

const TAB_PREFETCH: Record<string, 'feed' | 'explore' | 'reels' | 'profile' | undefined> = {
  '/feed': 'feed',
  '/explore': 'explore',
  '/reels': 'reels',
  '/profile': 'profile',
};

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const qc = useQueryClient();
  const notifUnread = useUnreadNotifications();
  const myUsername = useAuthStore((s) => s.user?.username);
  const prevPath = useRef(pathname);

  const warmTab = useCallback(
    (href: string) => {
      const tab = TAB_PREFETCH[href];
      if (!tab) return;
      void router.prefetch(href === '/profile' && myUsername ? `/profile/${myUsername}` : href);
      import('@/lib/tab-prefetch').then((m) => m.prefetchMainTab(qc, tab, myUsername ?? null));
    },
    [qc, router, myUsername],
  );

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (typeof performance === 'undefined') return;
    performance.mark('tab-switch-start');
    requestAnimationFrame(() => {
      performance.mark('tab-content-visible');
      try {
        performance.measure('tab-switch', 'tab-switch-start', 'tab-content-visible');
      } catch {
        /* duplicate measure */
      }
    });
  }, [pathname]);

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe"
    >
      <ul className="mx-auto grid h-bottom-nav max-w-2xl grid-cols-5 items-stretch">
        {items.map(({ href, label, Icon, filledWhenActive, center, notify }) => {
          const resolvedHref = href === '/profile' && myUsername ? `/profile/${myUsername}` : href;
          const active =
            href === '/feed'
              ? pathname === '/' || pathname === '/feed'
              : href === '/profile'
                ? pathname === '/profile' || pathname.startsWith('/profile/')
                : pathname === href || pathname.startsWith(`${href}/`);
          const filled = filledWhenActive && active;
          const badge = notify ? notifUnread : 0;

          return (
            <li key={href} className="contents">
              <Link
                href={resolvedHref}
                aria-current={active ? 'page' : undefined}
                aria-label={
                  badge > 0 ? `${label} (${formatPersianNumber(badge)} اعلان جدید)` : label
                }
                prefetch
                onPointerEnter={() => warmTab(href)}
                onFocus={() => warmTab(href)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 tap-none transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  center && '-mt-3',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'relative inline-flex items-center justify-center',
                    center &&
                      'size-12 rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-surface',
                  )}
                >
                  <Icon
                    className={cn(center ? 'size-6' : 'size-[var(--ig-icon)]')}
                    filled={center ? false : filled}
                    strokeWidth={active ? 2.1 : 1.75}
                    aria-hidden
                  />
                  {badge > 0 ? (
                    <span
                      aria-hidden
                      className="absolute -end-0.5 -top-0.5 grid min-w-[1rem] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-surface"
                    >
                      {formatPersianNumber(badge > 9 ? 9 : badge)}
                      {badge > 9 ? '+' : ''}
                    </span>
                  ) : null}
                </span>
                {!center ? (
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                ) : (
                  <span className="text-[10px] font-semibold leading-none text-primary">
                    {label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
