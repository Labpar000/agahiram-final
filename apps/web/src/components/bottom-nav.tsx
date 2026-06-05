'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IgCreate,
  IgHome,
  IgReels,
  IgSearch,
  IgTabBar,
  IgUser,
  tabLinkClass,
} from '@agahiram/ui';
import { useAuthStore } from '@/lib/auth-store';
import { isImmersiveStoryViewerRoute } from '@/lib/story-viewer-routes';

const items = [
  { href: '/feed', label: 'خانه', Icon: IgHome, filledWhenActive: true },
  { href: '/explore', label: 'جستجو', Icon: IgSearch, filledWhenActive: true },
  { href: '/create', label: 'آگهی', Icon: IgCreate, filledWhenActive: false },
  { href: '/reels', label: 'ریلز', Icon: IgReels, filledWhenActive: true },
  { href: '/profile', label: 'پروفایل', Icon: IgUser, filledWhenActive: true, useAvatar: true },
] as const;

const TAB_PREFETCH: Record<string, 'feed' | 'explore' | 'reels' | 'profile' | undefined> = {
  '/feed': 'feed',
  '/explore': 'explore',
  '/reels': 'reels',
  '/profile': 'profile',
};

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const hideOnStoryViewer = isImmersiveStoryViewerRoute(pathname);
  const router = useRouter();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const myUsername = useAuthStore((s) => s.user?.username);
  const myAvatar = useAuthStore((s) => s.user?.avatar);
  const prevPath = useRef(pathname);

  const warmTab = useCallback(
    (href: string) => {
      const tab = TAB_PREFETCH[href];
      if (!tab) return;
      const target =
        href === '/profile'
          ? !isAuthenticated
            ? '/login'
            : myUsername
              ? `/profile/${myUsername}`
              : '/onboarding'
          : href;
      void router.prefetch(target);
      import('@/lib/tab-prefetch').then((m) => m.prefetchMainTab(qc, tab, myUsername ?? null));
    },
    [qc, router, myUsername, isAuthenticated],
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

  if (hideOnStoryViewer) return null;

  return (
    <IgTabBar>
      {items.map((item) => {
        const { href, label, Icon, filledWhenActive } = item;
        const useAvatar = 'useAvatar' in item && item.useAvatar;
        const resolvedHref =
          href === '/profile'
            ? !isAuthenticated
              ? '/login'
              : myUsername
                ? `/profile/${myUsername}`
                : '/onboarding'
            : href;
        const active =
          href === '/feed'
            ? pathname === '/' || pathname === '/feed'
            : href === '/profile'
              ? pathname === '/profile' || pathname.startsWith('/profile/')
              : pathname === href || pathname.startsWith(`${href}/`);
        const filled = filledWhenActive && active;
        const showAvatar = useAvatar && myUsername;

        return (
          <li key={href} className="contents">
            <Link
              href={resolvedHref}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              prefetch
              onPointerEnter={() => warmTab(href)}
              onFocus={() => warmTab(href)}
              className={tabLinkClass(active)}
            >
              <span className="relative inline-flex items-center justify-center">
                {showAvatar ? (
                  <Avatar
                    className={cn(
                      'size-[1.375rem] ring-2 ring-offset-1 ring-offset-surface',
                      active ? 'ring-foreground' : 'ring-transparent',
                    )}
                  >
                    {myAvatar ? <AvatarImage src={myAvatar} alt="" /> : null}
                    <AvatarFallback className="text-[8px] font-semibold">
                      {(myUsername ?? '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon
                    className="size-[var(--ig-icon)]"
                    filled={filled}
                    strokeWidth={active ? 2.1 : 1.75}
                    aria-hidden
                  />
                )}
              </span>
              <span className="sr-only">{label}</span>
            </Link>
          </li>
        );
      })}
    </IgTabBar>
  );
}
