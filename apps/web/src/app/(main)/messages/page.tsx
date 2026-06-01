'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  EmptyState,
  IgClose,
  IgDirect,
  IgSearch,
  Input,
  Skeleton,
  toast,
} from '@agahiram/ui';
import type { ConversationSummary } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { formatLastMessagePreview } from '@/hooks/useConversation';

type UserHit = {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
};

export default function MessagesPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const r = await apiClient.get<ConversationSummary[]>('/messages/conversations');
      if (r.success && r.data) return r.data;
      if (process.env.NODE_ENV === 'development') {
        const { mockConversations } = await import('@/lib/mock-data');
        return mockConversations;
      }
      return [] as ConversationSummary[];
    },
  });

  const userQuery = useQuery({
    queryKey: ['user-search', debouncedQ],
    queryFn: async () => {
      const r = await apiClient.get<UserHit[]>('/users/search', { q: debouncedQ });
      return r.data ?? [];
    },
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  const filteredConversations = useMemo(() => {
    const all = data ?? [];
    if (!debouncedQ) return all;
    const needle = debouncedQ.toLowerCase();
    return all.filter((c) => {
      const u = c.otherUser;
      if (!u) return false;
      return (
        (u.username ?? '').toLowerCase().includes(needle) ||
        (u.name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [data, debouncedQ]);

  const startWith = async (username: string) => {
    if (!username || starting) return;
    setStarting(username);
    try {
      const r = await apiClient.post<{ conversationId: string }>(`/messages/start/${username}`);
      if (r.success && r.data) {
        router.push(`/messages/${r.data.conversationId}`);
      } else {
        toast.error(r.error ?? 'برای شروع گفتگو ابتدا وارد شوید');
      }
    } finally {
      setStarting(null);
    }
  };

  const hasSearch = debouncedQ.length >= 2;
  const userHits = (userQuery.data ?? []).filter(
    (u) => u.username && !filteredConversations.some((c) => c.otherUser?.id === u.id),
  );

  return (
    <div className="bg-background">
      <div className="glass sticky top-[var(--header-height)] z-20 border-b border-border-subtle px-4 py-3">
        <h1 className="mb-3 text-base font-semibold">پیام‌ها</h1>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو"
          className="h-9 rounded-full border-0 bg-muted text-sm"
          aria-label="جستجوی کاربر"
          leadingIcon={<IgSearch className="size-4" strokeWidth={1.75} aria-hidden />}
          trailingIcon={
            q ? (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label="پاک کردن"
                className="pointer-events-auto -me-1 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted/80"
              >
                <IgClose className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null
          }
        />
      </div>

      {hasSearch && userHits.length > 0 ? (
        <section aria-label="کاربران" className="bg-surface">
          <h2 className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            شروع گفتگوی جدید
          </h2>
          <ul className="divide-y divide-border">
            {userHits.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => void startWith(u.username!)}
                  disabled={starting === u.username}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-60"
                >
                  <Avatar size="lg" verified={u.isVerified}>
                    {u.avatar ? <AvatarImage src={u.avatar} alt="" /> : null}
                    <AvatarFallback>{(u.username ?? '?').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.username}</p>
                    {u.name ? (
                      <p className="truncate text-xs text-muted-foreground">{u.name}</p>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold text-ig-link">پیام دادن</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isLoading ? (
        <ul className="divide-y divide-border bg-surface">
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
      ) : filteredConversations.length === 0 && userHits.length === 0 ? (
        hasSearch ? (
          <EmptyState
            icon={<IgSearch className="size-7" strokeWidth={1.75} aria-hidden />}
            title="کاربری یافت نشد"
            description="نام کاربری دیگری را امتحان کنید."
          />
        ) : (
          <EmptyState
            icon={<IgDirect className="size-7" strokeWidth={1.75} aria-hidden />}
            title="هنوز گفتگویی ندارید"
            description="با جستجوی نام کاربری در بالا، گفتگوی جدیدی شروع کنید."
          />
        )
      ) : (
        <ul className="divide-y divide-border bg-surface">
          {filteredConversations.map((c) => (
            <li key={c.id} className="cv-row">
              <Link
                href={`/messages/${c.id}`}
                aria-label={`گفتگو با ${c.otherUser?.username}${c.unreadCount > 0 ? ` (${formatPersianNumber(c.unreadCount)} پیام جدید)` : ''}`}
                className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none tap-none"
              >
                <Avatar size="lg" className="size-14">
                  {c.otherUser?.avatar ? <AvatarImage src={c.otherUser.avatar} alt="" /> : null}
                  <AvatarFallback>{(c.otherUser?.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.otherUser?.username}</span>
                    {c.lastMessage ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
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
                    {formatLastMessagePreview(c.lastMessage)}
                  </p>
                </div>
                {c.unreadCount > 0 ? (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-ig-badge px-1.5 text-[11px] font-bold text-white">
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
