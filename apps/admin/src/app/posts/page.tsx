'use client';

import { Suspense, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Filter, Search, Sparkles, Trash2, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  ErrorState,
  IconButton,
  Input,
  Spinner,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { PostStatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type Column } from '@/components/data-table';
import { apiClient } from '@/lib/api';

interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface CityOption {
  id: string;
  name: string;
  province: { name: string };
}

interface Post {
  id: string;
  title: string;
  price: number | string | null;
  status: string;
  type?: string;
  isPromoted: boolean;
  viewCount: number;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; avatar: string | null };
  category: { id: string; name: string } | null;
  city: { id: string; name: string } | null;
  media: Array<{ url: string; thumbnailUrl: string | null; type: string }>;
  _count: { likes: number; comments: number; reports: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'pendingReview', label: 'در انتظار تأیید' },
  { value: 'approved', label: 'منتشرشده' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'sold', label: 'فروخته‌شده' },
  { value: 'expired', label: 'منقضی' },
  { value: 'deleted', label: 'حذف‌شده' },
];

const PAGE_SIZE = 20;

function PostsInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId') ?? '';
  const initialQ = searchParams.get('q') ?? '';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState('');
  const [type, setType] = useState<'' | 'post' | 'reel'>('');
  const [categoryId, setCategoryId] = useState('');
  const [cityId, setCityId] = useState('');
  const [userId, setUserId] = useState(initialUserId);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [promoted, setPromoted] = useState<'' | 'true' | 'false'>('');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<
    { type: 'bulk-approve'; ids: string[] } | { type: 'delete'; post: Post } | null
  >(null);

  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => (await apiClient.get<CategoryOption[]>('/admin/categories')).data ?? [],
    staleTime: 120_000,
  });

  const cities = useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: async () => (await apiClient.get<CityOption[]>('/admin/cities')).data ?? [],
    staleTime: 120_000,
  });

  const list = useQuery({
    queryKey: [
      'admin',
      'posts',
      { page, q, status, type, categoryId, cityId, promoted, userId, dateFrom, dateTo },
    ],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: Post[];
          page: number;
          pageSize: number;
          total: number;
        }>('/admin/posts', {
          page,
          pageSize: PAGE_SIZE,
          q,
          status,
          type: type || undefined,
          categoryId: categoryId || undefined,
          cityId: cityId || undefined,
          promoted: promoted || undefined,
          userId: userId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
      ).data,
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await apiClient.post<{ approved: number; failed: number }>(
        '/admin/posts/bulk-approve',
        { ids },
      );
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data!;
    },
    onSuccess: (r) => {
      toast.success(`${formatPersianNumber(r.approved)} مورد تأیید شد`);
      setSelection(new Set());
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removePost = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const r = await apiClient.delete(`/admin/posts/${id}`, { reason });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('آگهی حذف شد');
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const allSelected = rows.length > 0 && rows.every((r) => selection.has(r.id));

  const toggleAll = () => {
    setSelection((prev) => {
      if (allSelected) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  };

  const toggle = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns: Column<Post>[] = useMemo(
    () => [
      {
        key: 'select',
        width: '40px',
        header: (
          <Checkbox
            aria-label="انتخاب همه"
            checked={allSelected}
            onCheckedChange={() => toggleAll()}
          />
        ),
        cell: (p) => (
          <Checkbox
            aria-label="انتخاب آگهی"
            checked={selection.has(p.id)}
            onCheckedChange={() => toggle(p.id)}
          />
        ),
      },
      {
        key: 'post',
        header: 'آگهی',
        cell: (p) => (
          <Link
            href={`/posts/${p.id}`}
            className="flex items-center gap-3 group"
            onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
              {p.media[0] ? (
                <Image
                  src={p.media[0].thumbnailUrl ?? p.media[0].url}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="truncate group-hover:underline">{p.title}</span>
                {p.type === 'reel' ? (
                  <Badge tone="brand" size="sm">
                    ریل
                  </Badge>
                ) : null}
                {p.isPromoted ? (
                  <Sparkles className="size-3.5 text-warning-foreground" aria-hidden />
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{p.category?.name ?? '—'}</span>
                {p.city ? (
                  <>
                    <span>·</span>
                    <span>{p.city.name}</span>
                  </>
                ) : null}
              </div>
            </div>
          </Link>
        ),
      },
      {
        key: 'user',
        header: 'فروشنده',
        hideOnMobile: true,
        cell: (p) => (
          <Link
            href={`/users/${p.user.id}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Avatar size="xs">
              {p.user.avatar ? <AvatarImage src={p.user.avatar} alt="" /> : null}
              <AvatarFallback>{(p.user.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-xs">@{p.user.username ?? '—'}</span>
          </Link>
        ),
      },
      {
        key: 'price',
        header: 'قیمت',
        hideOnMobile: true,
        cell: (p) => (
          <span className="font-medium text-sm tabular-nums">
            {p.price != null ? formatPersianPrice(Number(p.price)) : '—'}
          </span>
        ),
      },
      {
        key: 'stats',
        header: 'اعداد',
        hideOnMobile: true,
        cell: (p) => (
          <div className="flex flex-wrap gap-1">
            <Badge tone="neutral" size="sm">
              {formatPersianNumber(p.viewCount)} بازدید
            </Badge>
            {p._count.reports > 0 ? (
              <Badge tone="destructive" size="sm">
                {formatPersianNumber(p._count.reports)} گزارش
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (p) => <PostStatusBadge status={p.status} />,
      },
      {
        key: 'createdAt',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (p) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatJalaliDate(p.createdAt, 'short')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (p) => (
          <div className="flex justify-end gap-1">
            <Link href={`/posts/${p.id}`}>
              <IconButton
                aria-label="مشاهده"
                size="sm"
                variant="ghost"
                icon={<ExternalLink className="size-4" />}
              />
            </Link>
            <IconButton
              aria-label="حذف"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              icon={<Trash2 className="size-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setConfirm({ type: 'delete', post: p });
              }}
            />
          </div>
        ),
      },
    ],
    [allSelected, selection, rows],
  );

  if (list.isError) {
    return (
      <Shell>
        <PageHeader title="آگهی‌ها" description="مدیریت همه‌ی آگهی‌ها در همه‌ی وضعیت‌ها" />
        <ErrorState onRetry={() => void list.refetch()} />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader title="آگهی‌ها" description="مدیریت همه‌ی آگهی‌ها در همه‌ی وضعیت‌ها" />

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
                placeholder="جستجو در عنوان و توضیحات…"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={type}
              onChange={(e) => {
                setType(e.target.value as '' | 'post' | 'reel');
                setPage(1);
              }}
            >
              <option value="">همه انواع</option>
              <option value="post">آگهی</option>
              <option value="reel">ریل</option>
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm max-w-[180px]"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              aria-label="دسته‌بندی"
            >
              <option value="">همه دسته‌ها</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm max-w-[180px]"
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value);
                setPage(1);
              }}
              aria-label="شهر"
            >
              <option value="">همه شهرها</option>
              {(cities.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.province?.name ? ` (${c.province.name})` : ''}
                </option>
              ))}
            </select>
            <Input
              size="sm"
              className="w-40"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
              placeholder="شناسه کاربر"
              dir="ltr"
            />
            <Input
              size="sm"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="از تاریخ"
            />
            <Input
              size="sm"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="تا تاریخ"
            />
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={promoted}
              onChange={(e) => setPromoted(e.target.value as '' | 'true' | 'false')}
            >
              <option value="">همه</option>
              <option value="true">فقط نردبان‌شده</option>
              <option value="false">بدون نردبان</option>
            </select>
            {(q ||
              status ||
              type ||
              categoryId ||
              cityId ||
              promoted ||
              userId ||
              dateFrom ||
              dateTo) && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setQ('');
                  setStatus('');
                  setType('');
                  setCategoryId('');
                  setCityId('');
                  setPromoted('');
                  setUserId('');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            )}
            <div className="ms-auto text-xs text-muted-foreground inline-flex items-center gap-1">
              <Filter className="size-3.5" /> {formatPersianNumber(total)} نتیجه
            </div>
          </div>
        </CardContent>
      </Card>

      {selection.size > 0 ? (
        <div className="sticky top-14 z-10 mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 shadow-card">
          <span className="text-sm font-semibold">
            {formatPersianNumber(selection.size)} مورد انتخاب شد
          </span>
          <Button
            size="sm"
            variant="brand"
            leftIcon={<Check className="size-4" />}
            onClick={() => setConfirm({ type: 'bulk-approve', ids: Array.from(selection) })}
          >
            تأیید همگی
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelection(new Set())}>
            لغو
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="هیچ آگهی‌ای پیدا نشد"
      />

      <ConfirmDialog
        open={confirm?.type === 'bulk-approve'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="تأیید گروهی"
        description={
          confirm?.type === 'bulk-approve'
            ? `${formatPersianNumber(confirm.ids.length)} آگهی منتشر شود؟`
            : null
        }
        confirmLabel="تأیید همگی"
        tone="brand"
        isLoading={bulkApprove.isPending}
        onConfirm={() => {
          if (confirm?.type === 'bulk-approve') bulkApprove.mutate(confirm.ids);
        }}
      />

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف آگهی"
        description={
          confirm?.type === 'delete'
            ? `آگهی «${confirm.post.title}» حذف می‌شود و کاربر مطلع می‌شود.`
            : null
        }
        confirmLabel="حذف"
        tone="destructive"
        reasonLabel="دلیل حذف (اجباری)"
        reasonRequired
        isLoading={removePost.isPending}
        onConfirm={(reason) => {
          if (confirm?.type === 'delete' && reason)
            removePost.mutate({ id: confirm.post.id, reason });
        }}
      />
    </Shell>
  );
}

export default function PostsPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="grid place-items-center py-16">
            <Spinner className="size-8" />
          </div>
        </Shell>
      }
    >
      <PostsInner />
    </Suspense>
  );
}
