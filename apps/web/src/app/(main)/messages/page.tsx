'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { Avatar, AvatarFallback, AvatarImage, EmptyState, Skeleton } from '@agahiram/ui';
import type { ConversationSummary } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { mockConversations } from '@/lib/mock-data';

export default function MessagesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const r = await apiClient.get<ConversationSummary[]>('/messages/conversations');
      if (r.success && r.data) return r.data;
      if (process.env.NODE_ENV === 'development') return mockConversations;
      return [];
    },
  });

  return (
    <div className="bg-background">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-h2 font-bold tracking-tight">پیام‌ها</h1>
      </div>

      {isLoading ? (
        <ul className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-3 w-3/4 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="size-7" aria-hidden />}
          title="هنوز گفتگویی ندارید"
          description="از پروفایل کاربران، گفتگوی جدیدی شروع کنید."
        />
      ) : (
        <ul className="divide-y divide-border">
          {(data ?? []).map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                aria-label={`گفتگو با ${c.otherUser?.username}${c.unreadCount > 0 ? ` (${formatPersianNumber(c.unreadCount)} پیام جدید)` : ''}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none tap-none"
              >
                <Avatar size="lg">
                  {c.otherUser?.avatar ? <AvatarImage src={c.otherUser.avatar} alt="" /> : null}
                  <AvatarFallback>{(c.otherUser?.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.otherUser?.username}</span>
                    {c.lastMessage ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTimeFa(c.lastMessage.createdAt)}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={
                      'truncate text-sm ' +
                      (c.unreadCount > 0
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground')
                    }
                  >
                    {c.lastMessage?.content ?? 'گفتگو را شروع کنید'}
                  </p>
                </div>
                {c.unreadCount > 0 ? (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {c.unreadCount > 9 ? '۹+' : formatPersianNumber(c.unreadCount)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
