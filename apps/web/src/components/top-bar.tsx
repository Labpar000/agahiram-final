'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, MessageCircle, Moon, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatPersianNumber } from '@agahiram/shared';
import { useTheme } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function TopBar() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data: notifUnread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const r = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return r.data?.count ?? 0;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const { data: msgUnread = 0 } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async () => {
      const r = await apiClient.get<{ count: number }>('/messages/unread-count');
      return r.data?.count ?? 0;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

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
