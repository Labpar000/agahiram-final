'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Compass, Film, Home, MessageCircle, PlusSquare, User } from 'lucide-react';
import { cn, formatPersianNumber } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

const items = [
  { href: '/feed', icon: Home, label: 'خانه' },
  { href: '/explore', icon: Compass, label: 'گردش' },
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

  const { data: msgUnread = 0 } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async () => {
      const r = await apiClient.get<{ count: number }>('/messages/unread-count');
      return r.data?.count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return (
    <nav aria-label="ناوبری اصلی" className="fixed inset-x-0 bottom-0 z-40 glass border-t pb-safe">
      <ul className="mx-auto grid h-bottom-nav max-w-2xl grid-cols-6 items-stretch">
        {items.map(({ href, icon: Icon, label, ...rest }) => {
          const active =
            href === '/feed'
              ? pathname === '/' || pathname === '/feed'
              : pathname === href || pathname.startsWith(`${href}/`);
          const badge = 'badgeQuery' in rest ? msgUnread : 0;
          return (
            <li key={href} className="contents">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-1 px-1 pt-2 pb-2 tap-none',
                  'min-h-11 text-[10px] font-medium leading-none',
                  'transition-colors duration-[var(--duration-fast)]',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    aria-hidden
                    className="absolute inset-x-3 top-1 h-1 rounded-full bg-foreground"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                ) : null}
                <span className="relative inline-flex">
                  <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
                  {badge > 0 ? (
                    <span
                      aria-label={`${formatPersianNumber(badge)} مورد جدید`}
                      className="absolute -end-1.5 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-surface"
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
