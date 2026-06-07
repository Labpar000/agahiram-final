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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const myUsername = useAuthStore((s) => s.user?.username);
  const myName = useAuthStore((s) => s.user?.name);
  const myAvatar = useAuthStore((s) => s.user?.avatar);
  const prevPath = useRef(pathname);

  const warmTab = useCallback(
    (href: string) => {
      const tab = TAB_PREFETCH[href];
      if (!tab) return;
      const target = href === '/profile' ? '/profile' : href;
      void router.prefetch(target);
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

  // FIXED: Hide bottom nav on reels for full-screen immersive experience
  if (hideOnStoryViewer || pathname === '/reels') return null;

  return (
    <IgTabBar>
      {items.map((item) => {
        const { href, label, Icon, filledWhenActive } = item;
        const useAvatar = 'useAvatar' in item && item.useAvatar;
        // Prefer direct username route; defer to /profile while auth hydrates; otherwise login.
        const resolvedHref =
          href === '/profile'
            ? myUsername
              ? `/profile/${myUsername}`
              : isLoading
                ? '/profile'
                : !isAuthenticated
                  ? '/login?redirect=/profile'
                  : '/profile'
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
          <li key={href} className="flex min-h-[var(--ig-action)] items-stretch justify-center">
            <Link
              href={resolvedHref}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              prefetch
              scroll={href === '/profile' ? false : undefined}
              onPointerEnter={() => warmTab(href)}
              onFocus={() => warmTab(href)}
              className={tabLinkClass(active)}
            >
              <span className="relative inline-flex items-center justify-center">
                {showAvatar ? (
                  myAvatar ? (
                    <Avatar
                      className={cn(
                        'size-[var(--ig-icon)]',
                        active && 'ring-[1.5px] ring-foreground',
                      )}
                    >
                      <AvatarImage src={myAvatar} alt="" />
                      <AvatarFallback className="text-[0.5625rem] font-semibold leading-none">
                        {(myName ?? myUsername ?? '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span
                      className={cn(
                        'grid size-[var(--ig-icon)] place-items-center rounded-full bg-muted text-muted-foreground',
                        active && 'text-foreground ring-[1.5px] ring-foreground',
                      )}
                      aria-hidden
                    >
                      <IgUser
                        className="size-[calc(var(--ig-icon)*0.58)]"
                        filled={active}
                        strokeWidth={active ? 2.1 : 1.75}
                      />
                    </span>
                  )
                ) : (
                  <Icon
                    className="size-[var(--ig-icon)]"
                    filled={filled}
                    strokeWidth={active ? 2.1 : 1.75}
                    aria-hidden
                  />
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </IgTabBar>
  );
}
