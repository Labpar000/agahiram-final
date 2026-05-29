'use client';

import { useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationType, type NotificationItem as Notif } from '@agahiram/shared';
import { EmptyState, Skeleton, toast } from '@agahiram/ui';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notification-item';

type Tab = 'all' | 'likes' | 'comments' | 'follows' | 'messages';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'likes', label: 'پسندها' },
  { key: 'comments', label: 'نظرات' },
  { key: 'follows', label: 'دنبال‌کنندگان' },
  { key: 'messages', label: 'پیام‌ها' },
];

function matchesTab(tab: Tab, n: Notif): boolean {
  if (tab === 'all') return true;
  if (tab === 'likes') return n.type === NotificationType.LIKE;
  if (tab === 'comments') return n.type === NotificationType.COMMENT;
  if (tab === 'follows') return n.type === NotificationType.FOLLOW;
  if (tab === 'messages') return n.type === NotificationType.MESSAGE;
  return false;
}

export default function NotificationsPage() {
  const { data, isLoading, markAllRead, markRead, unreadCount } = useNotifications();
  const [tab, setTab] = useState<Tab>('all');

  const filtered = useMemo(() => (data ?? []).filter((n) => matchesTab(tab, n)), [data, tab]);

  return (
    <div className="bg-background">
      <div className="sticky top-[var(--header-height)] z-20 space-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-h3 font-bold tracking-tight">اعلان‌ها</h1>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                markAllRead.mutate();
                toast.success('همه اعلان‌ها خوانده شد');
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CheckCheck className="size-4" aria-hidden />
              علامت‌گذاری همه به‌عنوان خوانده‌شده
            </button>
          ) : null}
        </div>
        <div
          role="tablist"
          aria-label="دسته‌بندی اعلان‌ها"
          className="flex gap-1.5 overflow-x-auto"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={
                'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ' +
                (tab === t.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-foreground hover:bg-muted')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ul className="divide-y divide-border bg-surface">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-7" aria-hidden />}
          title="فعلاً اعلانی نیست"
          description="اعلان‌های جدید درباره پسندها، نظرات و آگهی‌ها اینجا نمایش داده می‌شوند."
        />
      ) : (
        <ul className="divide-y divide-border bg-surface">
          {filtered.map((n: Notif) => (
            <li key={n.id}>
              <NotificationItem notif={n} onClick={() => !n.isRead && markRead.mutate(n.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
