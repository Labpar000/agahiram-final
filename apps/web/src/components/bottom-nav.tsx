'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@agahiram/shared';
import { IgCreate, IgHome, IgReels, IgSearch, IgUser } from '@agahiram/ui';
import { useAuthStore } from '@/lib/auth-store';

const items = [
  {
    href: '/feed',
    label: 'خانه',
    Icon: IgHome,
    filledWhenActive: true,
  },
  {
    href: '/explore',
    label: 'جستجو',
    Icon: IgSearch,
    filledWhenActive: true,
  },
  {
    href: '/create',
    label: 'آگهی',
    Icon: IgCreate,
    filledWhenActive: false,
  },
  {
    href: '/reels',
    label: 'ریلز',
    Icon: IgReels,
    filledWhenActive: true,
  },
  {
    href: '/profile',
    label: 'پروفایل',
    Icon: IgUser,
    filledWhenActive: true,
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
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle pb-safe"
    >
      <ul className="mx-auto grid h-[var(--bottom-nav)] max-w-2xl grid-cols-5 items-center">
        {items.map(({ href, label, Icon, filledWhenActive }) => {
          const resolvedHref = href === '/profile' && myUsername ? `/profile/${myUsername}` : href;
          const active =
            href === '/feed'
              ? pathname === '/' || pathname === '/feed'
              : href === '/profile'
                ? pathname === '/profile' || pathname.startsWith('/profile/')
                : pathname === href || pathname.startsWith(`${href}/`);
          const filled = filledWhenActive && active;

          return (
            <li key={href} className="contents">
              <Link
                href={resolvedHref}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                prefetch
                onPointerEnter={() => warmTab(href)}
                onFocus={() => warmTab(href)}
                className={cn(
                  'relative flex h-full items-center justify-center tap-none transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="relative inline-flex items-center justify-center">
                  <Icon
                    className="size-[var(--ig-icon)]"
                    filled={filled}
                    strokeWidth={active ? 2.1 : 1.75}
                    aria-hidden
                  />
                </span>
                <span className="sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
