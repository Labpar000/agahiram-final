'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Filter, Flag, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ReportStatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string | null; name: string | null };
  post: {
    id: string;
    title: string;
    status: string;
    user: { id: string; username: string | null };
    media: Array<{ url: string; thumbnailUrl: string | null }>;
  } | null;
}

interface GroupedReport {
  postId: string;
  count: number;
  latestAt: string;
  post:
    | (Report['post'] & {
        reports: Array<{
          reason: string;
          details: string | null;
          reporter: { username: string | null };
          createdAt: string;
        }>;
      })
    | null;
}

const PAGE_SIZE = 30;

export default function ReportsPage() {
  const [tab, setTab] = useState<'pending' | 'grouped' | 'resolved' | 'dismissed'>('pending');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);

  return (
    <Shell>
      <PageHeader title="گزارش‌های تخلف" description="رسیدگی به گزارش‌های ارسالی کاربران" />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as typeof tab);
          setPage(1);
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="pending">در انتظار</TabsTrigger>
          <TabsTrigger value="grouped">گروه‌بندی‌شده</TabsTrigger>
          <TabsTrigger value="resolved">حل‌شده</TabsTrigger>
          <TabsTrigger value="dismissed">رد شده</TabsTrigger>
        </TabsList>

        {tab !== 'grouped' ? (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1">
              <Input
                size="sm"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setPage(1);
                }}
                placeholder="فیلتر بر اساس دلیل…"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
          </div>
        ) : null}

        <TabsContent value="pending">
          <ListView status="pending" reason={reason} page={page} onPageChange={setPage} />
        </TabsContent>
        <TabsContent value="grouped">
          <GroupedView />
        </TabsContent>
        <TabsContent value="resolved">
          <ListView status="resolved" reason={reason} page={page} onPageChange={setPage} />
        </TabsContent>
        <TabsContent value="dismissed">
          <ListView status="dismissed" reason={reason} page={page} onPageChange={setPage} />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function ListView({
  status,
  reason,
  page,
  onPageChange,
}: {
  status: string;
  reason: string;
  page: number;
  onPageChange: (p: number) => void;
}) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<{ type: 'remove' | 'dismiss'; report: Report } | null>(
    null,
  );

  const list = useQuery({
    queryKey: ['admin', 'reports', status, reason, page],
    queryFn: async () =>
      (
        await apiClient.get<{ data: Report[]; total: number }>('/admin/reports', {
          status,
          reason,
          page,
          pageSize: PAGE_SIZE,
        })
      ).data,
  });

  const resolve = useMutation({
    mutationFn: async ({
      id,
      action,
      reason: r,
    }: {
      id: string;
      action: 'dismiss' | 'remove';
      reason?: string;
    }) => {
      const r2 = await apiClient.post(`/admin/reports/${id}/resolve`, { action, reason: r });
      if (!r2.success) throw new Error(r2.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('گزارش رسیدگی شد');
      setPending(null);
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (list.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="!p-4">
              <Skeleton className="mb-2 h-4 w-1/3" />
              <Skeleton className="mb-2 h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (list.isError) return <ErrorState onRetry={() => list.refetch()} />;
  const rows = list.data?.data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-7" />}
        title={status === 'pending' ? 'گزارشی در انتظار نیست' : 'موردی پیدا نشد'}
      />
    );
  }

  return (
    <>
      <div className="mb-3 text-xs text-muted-foreground inline-flex items-center gap-1">
        <Filter className="size-3.5" /> {formatPersianNumber(list.data?.total ?? 0)} گزارش
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Card>
              <CardContent className="!p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning" icon={<Flag className="size-3" />}>
                        {r.reason}
                      </Badge>
                      <ReportStatusBadge status={r.status} />
                      <time className="text-[11px] text-muted-foreground tabular-nums">
                        {formatJalaliDate(r.createdAt, 'dateTime')}
                      </time>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">گزارش‌دهنده:</span>{' '}
                      <Link
                        href={`/users/${r.reporter.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        @{r.reporter.username ?? '—'}
                      </Link>
                    </p>
                    {r.details ? (
                      <p className="text-sm text-muted-foreground">{r.details}</p>
                    ) : null}
                    {r.post ? (
                      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {r.post.media[0] ? (
                            <Image
                              src={r.post.media[0].thumbnailUrl ?? r.post.media[0].url}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/posts/${r.post.id}`}
                            className="inline-flex items-center gap-1 font-medium text-sm hover:underline"
                          >
                            {r.post.title}
                            <ExternalLink className="size-3" />
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            از{' '}
                            <Link href={`/users/${r.post.user.id}`} className="hover:underline">
                              @{r.post.user.username}
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {r.status === 'pending' ? (
                    <div className="flex gap-2 md:shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Trash2 className="size-4" />}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setPending({ type: 'remove', report: r })}
                      >
                        حذف آگهی
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPending({ type: 'dismiss', report: r })}
                      >
                        رد گزارش
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {list.data && list.data.total > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            قبلی
          </Button>
          <span className="text-muted-foreground tabular-nums">
            صفحه {formatPersianNumber(page)} از{' '}
            {formatPersianNumber(Math.ceil((list.data.total ?? 0) / PAGE_SIZE))}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page * PAGE_SIZE >= (list.data?.total ?? 0)}
            onClick={() => onPageChange(page + 1)}
          >
            بعدی
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.type === 'remove' ? 'حذف آگهی گزارش‌شده' : 'رد گزارش'}
        description={
          pending?.type === 'remove'
            ? 'آگهی حذف می‌شود، از موتور جستجو پاک می‌شود و کاربر اعلان می‌گیرد.'
            : 'این گزارش بدون اقدام بسته می‌شود.'
        }
        confirmLabel={pending?.type === 'remove' ? 'حذف' : 'رد گزارش'}
        tone={pending?.type === 'remove' ? 'destructive' : 'primary'}
        reasonLabel={pending?.type === 'remove' ? 'دلیل حذف' : undefined}
        reasonRequired={pending?.type === 'remove'}
        isLoading={resolve.isPending}
        onConfirm={(reason) => {
          if (!pending) return;
          resolve.mutate({ id: pending.report.id, action: pending.type, reason });
        }}
      />
    </>
  );
}

function GroupedView() {
  const list = useQuery({
    queryKey: ['admin', 'reports-grouped'],
    queryFn: async () =>
      (await apiClient.get<GroupedReport[]>('/admin/reports/grouped')).data ?? [],
  });

  if (list.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="!p-4">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if ((list.data ?? []).length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-7" />}
        title="گزارش گروه‌بندی‌شده‌ای وجود ندارد"
      />
    );
  }
  return (
    <ul className="space-y-3">
      {(list.data ?? []).map((g) => (
        <li key={g.postId}>
          <Card>
            <CardContent className="!p-4">
              <div className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {g.post?.media?.[0] ? (
                    <Image
                      src={g.post.media[0].thumbnailUrl ?? g.post.media[0].url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/posts/${g.postId}`}
                    className="font-semibold text-sm hover:underline truncate inline-block"
                  >
                    {g.post?.title ?? '—'}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    آخرین گزارش {formatJalaliDate(g.latestAt, 'dateTime')}
                  </div>
                </div>
                <Badge tone="destructive">{formatPersianNumber(g.count)} گزارش</Badge>
              </div>
              {g.post?.reports?.length ? (
                <ul className="mt-3 space-y-1">
                  {g.post.reports.map((r, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold">{r.reason}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        — @{r.reporter.username ?? '—'} · {formatJalaliDate(r.createdAt, 'short')}
                      </span>
                      {r.details ? (
                        <div className="mt-0.5 text-muted-foreground">{r.details}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
