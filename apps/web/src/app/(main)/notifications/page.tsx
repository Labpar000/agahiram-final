'use client';

import { useMemo, useState } from 'react';
import { NotificationType, type NotificationItem as Notif } from '@agahiram/shared';
import { formatRelativeTimeFa } from '@agahiram/shared';
import { EmptyState, IgActivity, IgCheckDouble, Skeleton, toast } from '@agahiram/ui';
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

type GroupKey = 'today' | 'week' | 'older';

function groupKey(dateStr: string): GroupKey {
  const d = new Date(dateStr);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);
  if (d >= startToday) return 'today';
  if (d >= startWeek) return 'week';
  return 'older';
}

const GROUP_LABELS: Record<GroupKey, string> = {
  today: 'امروز',
  week: 'این هفته',
  older: 'قدیمی‌تر',
};

export default function NotificationsPage() {
  const { data, isLoading, markAllRead, markRead, unreadCount } = useNotifications();
  const [tab, setTab] = useState<Tab>('all');

  const filtered = useMemo(() => (data ?? []).filter((n) => matchesTab(tab, n)), [data, tab]);

  const grouped = useMemo(() => {
    const buckets: Record<GroupKey, Notif[]> = { today: [], week: [], older: [] };
    for (const n of filtered) {
      buckets[groupKey(n.createdAt)].push(n);
    }
    return (['today', 'week', 'older'] as const)
      .filter((k) => buckets[k].length > 0)
      .map((k) => ({
        key: k,
        label: GROUP_LABELS[k],
        items: buckets[k],
      }));
  }, [filtered]);

  return (
    <div className="bg-background">
      <div className="glass sticky top-[var(--header-height)] z-20 border-b border-border-subtle px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold">اعلان‌ها</h1>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                markAllRead.mutate();
                toast.success('همه اعلان‌ها خوانده شد');
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-ig-link transition-colors hover:bg-muted/60 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IgCheckDouble className="size-4" strokeWidth={1.75} aria-hidden />
              خوانده‌شده
            </button>
          ) : null}
        </div>
        <div
          role="tablist"
          aria-label="دسته‌بندی اعلان‌ها"
          className="mt-2 flex gap-1 overflow-x-auto scrollbar-hide"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ' +
                (tab === t.key
                  ? 'bg-foreground text-background'
                  : 'bg-muted/80 text-foreground hover:bg-muted')
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
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IgActivity className="size-7" strokeWidth={1.5} aria-hidden />}
          title="فعلاً اعلانی نیست"
          description="اعلان‌های جدید درباره پسندها، نظرات و آگهی‌ها اینجا نمایش داده می‌شوند."
        />
      ) : (
        <div className="bg-surface">
          {grouped.map((group) => (
            <section key={group.key}>
              <h2 className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                {group.label}
              </h2>
              <ul className="divide-y divide-border-subtle">
                {group.items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem
                      notif={n}
                      onClick={() => !n.isRead && markRead.mutate(n.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
