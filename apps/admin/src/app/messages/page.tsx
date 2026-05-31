'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Search, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Input,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { apiClient } from '@/lib/api';

interface ConversationRow {
  id: string;
  updatedAt: string;
  participants: Array<{
    user: {
      id: string;
      username: string | null;
      name: string | null;
      avatar: string | null;
    };
  }>;
  messages: Array<{ id: string; content: string; type: string }>;
}

const PAGE_SIZE = 30;

export default function MessagesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const list = useQuery({
    queryKey: ['admin', 'conversations', { page, q }],
    queryFn: async () =>
      (
        await apiClient.get<{ data: ConversationRow[]; total: number }>('/admin/conversations', {
          page,
          pageSize: PAGE_SIZE,
          q,
        })
      ).data,
  });

  const columns: Column<ConversationRow>[] = useMemo(
    () => [
      {
        key: 'participants',
        header: 'شرکت‌کنندگان',
        cell: (row) => (
          <Link
            href={`/messages/${row.id}`}
            className="inline-flex flex-wrap items-center gap-2 hover:underline"
          >
            {row.participants.slice(0, 3).map((p) => (
              <span key={p.user.id} className="inline-flex items-center gap-1.5">
                <Avatar size="xs">
                  {p.user.avatar ? <AvatarImage src={p.user.avatar} alt="" /> : null}
                  <AvatarFallback>{(p.user.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="text-xs">@{p.user.username ?? '—'}</span>
              </span>
            ))}
            {row.participants.length > 3 ? (
              <span className="text-xs text-muted-foreground">
                +{formatPersianNumber(row.participants.length - 3)}
              </span>
            ) : null}
          </Link>
        ),
      },
      {
        key: 'preview',
        header: 'آخرین پیام',
        cell: (row) => {
          const last = row.messages[0];
          if (!last) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <Link href={`/messages/${row.id}`} className="block max-w-xl hover:underline">
              <p className="text-sm truncate">{last.content || `(${last.type})`}</p>
            </Link>
          );
        },
      },
      {
        key: 'updatedAt',
        header: 'به‌روزرسانی',
        hideOnMobile: true,
        cell: (row) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatJalaliDate(row.updatedAt, 'dateTime')}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Shell>
      <PageHeader title="مدیریت پیام‌ها" description="مشاهده گفتگوها و حذف پیام‌های نامناسب" />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[240px]">
              <Input
                size="sm"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="جستجو نام کاربری، نام یا موبایل…"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            {q ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setQ('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
            <div className="ms-auto text-xs text-muted-foreground">
              {formatPersianNumber(list.data?.total ?? 0)} گفتگو
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={list.data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/messages/${row.id}`)}
        emptyTitle="گفتگویی پیدا نشد"
        emptyIcon={<MessageSquare className="size-7" />}
      />
    </Shell>
  );
}
