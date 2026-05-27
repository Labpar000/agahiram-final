'use client';

import Link from 'next/link';
import { Bell, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatPersianNumber } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

export function TopBar() {
  const { data: notifUnread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const r = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return r.data?.count ?? 0;
    },
    refetchInterval: 30_000,
  });

  const { data: msgUnread = 0 } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async () => {
      const r = await apiClient.get<{ count: number }>('/messages/unread-count');
      return r.data?.count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return (
    <header className="sticky top-0 z-30 glass border-b">
      <div className="mx-auto flex h-[var(--header-height)] max-w-2xl items-center justify-between px-4">
        <Link
          href="/feed"
          aria-label="آگهی‌گرام"
          className="group inline-flex items-center gap-2 tap-none"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-xl gradient-brand text-white shadow-sm"
          >
            <span className="font-display text-base font-extrabold leading-none">آ</span>
          </span>
          <span className="gradient-text-brand text-lg font-extrabold tracking-tight">
            آگهی‌گرام
          </span>
        </Link>

        <div className="flex items-center gap-1">
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
      className="relative grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tap-none"
    >
      {icon}
      {badge > 0 ? (
        <span
          aria-hidden
          className="absolute end-1.5 top-1.5 grid min-w-4 h-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-surface"
        >
          {badge > 9 ? '۹+' : formatPersianNumber(badge)}
        </span>
      ) : null}
    </Link>
  );
}
