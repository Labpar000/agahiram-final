'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, formatPersianNumber } from '@agahiram/shared';
import { IgCreate, IgDirect, IgHome, IgReels, IgSearch, IgUser } from '@agahiram/ui';
import { useUnreadMessages } from '@/hooks/useUnreadCounts';
import { useAuthStore } from '@/lib/auth-store';

const items = [
  { href: '/feed', label: 'خانه', Icon: IgHome, filledWhenActive: true },
  { href: '/explore', label: 'اکسپلور', Icon: IgSearch, filledWhenActive: true },
  { href: '/create', label: 'افزودن', Icon: IgCreate, filledWhenActive: false },
  { href: '/reels', label: 'ریلز', Icon: IgReels, filledWhenActive: true },
  {
    href: '/messages',
    label: 'پیام‌ها',
    Icon: IgDirect,
    filledWhenActive: true,
    badgeQuery: 'messages-unread' as const,
  },
  { href: '/profile', label: 'پروفایل', Icon: IgUser, filledWhenActive: true },
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const msgUnread = useUnreadMessages();
  const myUsername = useAuthStore((s) => s.user?.username);

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe"
    >
      <ul className="mx-auto grid h-bottom-nav max-w-2xl grid-cols-6 items-stretch">
        {items.map(({ href, label, Icon, filledWhenActive, ...rest }) => {
          const resolvedHref = href === '/profile' && myUsername ? `/profile/${myUsername}` : href;
          const active =
            href === '/feed'
              ? pathname === '/' || pathname === '/feed'
              : href === '/profile'
                ? pathname === '/profile' || pathname.startsWith('/profile/')
                : pathname === href || pathname.startsWith(`${href}/`);
          const badge = 'badgeQuery' in rest ? msgUnread : 0;
          const filled = filledWhenActive && active;

          return (
            <li key={href} className="contents">
              <Link
                href={resolvedHref}
                aria-current={active ? 'page' : undefined}
                aria-label={
                  badge > 0 ? `${label} (${formatPersianNumber(badge)} مورد جدید)` : label
                }
                prefetch
                className={cn(
                  'relative flex flex-col items-center justify-center tap-none',
                  'transition-colors duration-[var(--duration-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="relative inline-flex">
                  <Icon
                    className="size-[var(--ig-icon)]"
                    filled={filled}
                    strokeWidth={active ? 2.1 : 1.75}
                    aria-hidden
                  />
                  {badge > 0 ? (
                    <span
                      aria-hidden
                      className="absolute -end-1 -top-0.5 size-2 rounded-full bg-destructive ring-2 ring-surface"
                    />
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
