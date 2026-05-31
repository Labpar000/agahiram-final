'use client';

import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ImageIcon, MessageSquare, Sparkles, Video, User } from 'lucide-react';
import { formatPersianNumber } from '@agahiram/shared';
import { Card, CardContent, ErrorState, Spinner } from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { adminFetch, isForbiddenError } from '@/lib/admin-api';
import { apiClient } from '@/lib/api';

interface MediaStats {
  posts: number;
  avatars: number;
  stories: number;
  reels: number;
  messages: number;
  draftPosts: number;
}

const STAT_ITEMS: Array<{
  key: keyof MediaStats;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: 'neutral' | 'brand' | 'success' | 'warning';
}> = [
  {
    key: 'posts',
    label: 'رسانه آگهی',
    description: 'تعداد فایل‌های رسانه‌ای آگهی‌ها',
    icon: ImageIcon,
    tone: 'brand',
  },
  {
    key: 'reels',
    label: 'ریل',
    description: 'رسانه‌های ویدیویی ریل',
    icon: Video,
    tone: 'brand',
  },
  {
    key: 'stories',
    label: 'استوری',
    description: 'تعداد استوری‌های منتشرشده',
    icon: Sparkles,
    tone: 'success',
  },
  {
    key: 'avatars',
    label: 'آواتار',
    description: 'کاربران با تصویر پروفایل',
    icon: User,
    tone: 'neutral',
  },
  {
    key: 'messages',
    label: 'پیام رسانه‌ای',
    description: 'تصویر و صوت در پیام‌ها',
    icon: MessageSquare,
    tone: 'neutral',
  },
  {
    key: 'draftPosts',
    label: 'پیش‌نویس',
    description: 'آگهی‌های در حالت پیش‌نویس',
    icon: FileText,
    tone: 'warning',
  },
];

export default function MediaPage() {
  const stats = useQuery({
    queryKey: ['admin', 'media', 'stats'],
    queryFn: () => adminFetch(() => apiClient.get<MediaStats>('/admin/media/stats')),
    refetchInterval: 60_000,
  });

  if (stats.isLoading) {
    return (
      <Shell adminOnly>
        <PageHeader title="آمار رسانه" description="تعداد فایل‌ها و رسانه‌های پلتفرم" />
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  }

  if (stats.isError) {
    return (
      <Shell adminOnly>
        <PageHeader title="آمار رسانه" description="تعداد فایل‌ها و رسانه‌های پلتفرم" />
        <ErrorState
          title={isForbiddenError(stats.error) ? 'دسترسی محدود' : undefined}
          onRetry={() => void stats.refetch()}
        />
      </Shell>
    );
  }

  const s = stats.data!;
  const total = s.posts + s.avatars + s.stories + s.reels + s.messages;

  return (
    <Shell adminOnly>
      <PageHeader
        title="آمار رسانه"
        description={`مجموع ${formatPersianNumber(total)} فایل رسانه‌ای در پلتفرم`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_ITEMS.map(({ key, label, description, icon: Icon, tone }) => (
          <Card key={key}>
            <CardContent className="!p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{description}</div>
                </div>
                <span
                  aria-hidden
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    tone === 'brand'
                      ? 'bg-accent text-accent-foreground'
                      : tone === 'success'
                        ? 'bg-success/10 text-success'
                        : tone === 'warning'
                          ? 'bg-warning/10 text-warning-foreground'
                          : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="size-5" />
                </span>
              </div>
              <div className="mt-4 text-3xl font-extrabold tabular-nums leading-none">
                {formatPersianNumber(s[key])}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
