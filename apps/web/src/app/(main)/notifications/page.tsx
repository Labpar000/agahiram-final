'use client';

import { Bell, CheckCheck } from 'lucide-react';
import type { NotificationItem as Notif } from '@agahiram/shared';
import { EmptyState, Skeleton, toast } from '@agahiram/ui';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notification-item';

export default function NotificationsPage() {
  const { data, isLoading, markAllRead, markRead, unreadCount } = useNotifications();

  return (
    <div className="bg-background">
      <div className="sticky top-[var(--header-height)] z-20 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md">
        <h1 className="text-h3 font-bold tracking-tight">اعلان‌ها</h1>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              markAllRead.mutate();
              toast.success('همه اعلان‌ها خوانده شد');
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent tap-none"
          >
            <CheckCheck className="size-4" aria-hidden />
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <ul className="divide-y divide-border">
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
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Bell className="size-7" aria-hidden />}
          title="فعلاً اعلانی نیست"
          description="اعلان‌های جدید درباره پسندها، نظرات و آگهی‌ها اینجا نمایش داده می‌شوند."
        />
      ) : (
        <ul className="divide-y divide-border">
          {(data ?? []).map((n: Notif) => (
            <li key={n.id}>
              <NotificationItem notif={n} onClick={() => !n.isRead && markRead.mutate(n.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
