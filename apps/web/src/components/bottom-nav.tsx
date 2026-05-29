'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Home, MessageCircle, PlusSquare, Search, User } from 'lucide-react';
import { cn, formatPersianNumber } from '@agahiram/shared';
import { useUnreadMessages } from '@/hooks/useUnreadCounts';
import { useAuthStore } from '@/lib/auth-store';

const items = [
  { href: '/feed', icon: Home, label: 'خانه' },
  { href: '/explore', icon: Search, label: 'اکسپلور' },
  { href: '/create', icon: PlusSquare, label: 'افزودن' },
  { href: '/reels', icon: Film, label: 'ریلز' },
  {
    href: '/messages',
    icon: MessageCircle,
    label: 'پیام‌ها',
    badgeQuery: 'messages-unread' as const,
  },
  { href: '/profile', icon: User, label: 'پروفایل' },
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const msgUnread = useUnreadMessages();
  // When the auth store already knows our username, link straight to the
  // canonical profile route instead of bouncing through `/profile`. The
  // hop-page ran a client redirect that sometimes flashed a "redirecting…"
  // placeholder, which is why the profile tab felt the slowest of all.
  const myUsername = useAuthStore((s) => s.user?.username);

  return (
    <nav aria-label="ناوبری اصلی" className="fixed inset-x-0 bottom-0 z-40 glass border-t pb-safe">
      <ul className="mx-auto grid h-bottom-nav max-w-2xl grid-cols-6 items-stretch px-1">
        {items.map(({ href, icon: Icon, label, ...rest }) => {
          const resolvedHref = href === '/profile' && myUsername ? `/profile/${myUsername}` : href;
          const active =
            href === '/feed'
              ? pathname === '/' || pathname === '/feed'
              : href === '/profile'
                ? pathname === '/profile' || pathname.startsWith('/profile/')
                : pathname === href || pathname.startsWith(`${href}/`);
          const badge = 'badgeQuery' in rest ? msgUnread : 0;
          return (
            <li key={href} className="contents">
              <Link
                href={resolvedHref}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                prefetch
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 pt-2 pb-2 tap-none',
                  'min-h-11 text-[10px] font-medium leading-none',
                  'transition-[background-color,color,transform] duration-[var(--duration-fast)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-1 h-1 rounded-full bg-foreground"
                  />
                ) : null}
                <span className="relative inline-flex">
                  <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
                  {badge > 0 ? (
                    <span
                      aria-label={`${formatPersianNumber(badge)} مورد جدید`}
                      className="absolute -end-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-surface"
                    >
                      {badge > 9 ? '۹+' : formatPersianNumber(badge)}
                    </span>
                  ) : null}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
