'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Search, Users, X } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  EmptyState,
  Input,
  Skeleton,
  toast,
} from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { karmaTier } from '@/lib/reputation';
import { useAuth } from '@/hooks/useAuth';

interface FollowUser {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  karma?: number;
  isFollowing: boolean;
  followsMe: boolean;
  isMutual: boolean;
}

export function FollowersClient({
  username,
  type,
}: {
  username: string;
  type: 'followers' | 'following';
}) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const queryKey = ['profile-follow-list', username, type, debouncedQ];
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await apiClient.get<FollowUser[]>(`/users/${username}/${type}`, {
        q: debouncedQ || undefined,
      });
      return r.data ?? [];
    },
  });

  const toggleFollow = async (u: FollowUser) => {
    if (!u.username || pendingId) return;
    setPendingId(u.id);
    const res = u.isFollowing
      ? await apiClient.delete(`/users/${u.username}/follow`)
      : await apiClient.post(`/users/${u.username}/follow`);
    setPendingId(null);
    if (!res.success) {
      toast.error('برای دنبال‌کردن ابتدا وارد شوید');
      return;
    }
    await qc.invalidateQueries({ queryKey });
  };

  const title = type === 'followers' ? 'دنبال‌کننده‌ها' : 'دنبال‌شده‌ها';

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-md">
        <Link
          href={`/profile/${username}`}
          aria-label="بازگشت"
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <ArrowRight className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="text-sm font-bold">{title}</h1>
          <p className="truncate text-[11px] text-muted-foreground">@{username}</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl">
        <div className="sticky top-[calc(var(--header-height)+3.25rem)] z-10 border-b border-border bg-background/95 p-3 backdrop-blur-md">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی نام یا نام کاربری…"
            leadingIcon={<Search className="size-4" aria-hidden />}
            trailingIcon={
              q ? (
                <button type="button" onClick={() => setQ('')} aria-label="پاک کردن">
                  <X className="size-4" aria-hidden />
                </button>
              ) : null
            }
          />
        </div>

        {isLoading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Users className="size-7" aria-hidden />}
            title={q ? 'نتیجه‌ای پیدا نشد' : 'هنوز کاربری اینجا نیست'}
            className="min-h-[18rem]"
          />
        ) : (
          <ul className="divide-y divide-border bg-surface">
            {data.map((u) => {
              const tier = karmaTier(u.karma);
              const isMe = me?.id === u.id;
              return (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/profile/${u.username}`} className="shrink-0">
                    <Avatar size="md" verified={u.isVerified}>
                      {u.avatar ? <AvatarImage src={u.avatar} alt="" /> : null}
                      <AvatarFallback>{(u.username ?? '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link href={`/profile/${u.username}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{u.name ?? u.username}</span>
                      {u.isMutual ? (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          متقابل
                        </span>
                      ) : u.followsMe ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          شما را دنبال می‌کند
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>@{u.username}</span>
                      {u.karma && u.karma >= 50 ? (
                        <span
                          className={cn('rounded-full px-1.5 py-0.5 font-semibold', tier.className)}
                        >
                          {tier.label}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                  {!isMe ? (
                    <Button
                      size="sm"
                      variant={u.isFollowing ? 'secondary' : 'brand'}
                      onClick={() => void toggleFollow(u)}
                      isLoading={pendingId === u.id}
                    >
                      {u.isFollowing ? 'دنبال‌شده' : u.followsMe ? 'فالو بک' : 'دنبال‌کردن'}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
