'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import { formatJalaliDate } from '@agahiram/shared';
import { Badge, Button, Card, CardContent, ErrorState, Spinner, toast } from '@agahiram/ui';
import Shell from '../layout-shell';
import { apiClient } from '@/lib/api';
import { DataTable, type Column } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface VerificationItem {
  id: string;
  type: string;
  status: string;
  documents: string[];
  adminNote: string | null;
  scoreGranted: number | null;
  createdAt: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    user: { id: string; username: string | null; name: string | null; phone: string };
  };
}

const TYPE_LABELS: Record<string, string> = {
  PHONE: 'موبایل',
  NATIONAL_ID: 'کد ملی',
  BUSINESS_LICENSE: 'جواز کسب',
  COMPANY_REG: 'ثبت شرکت',
  ENAMAD: 'نماد اعتماد',
  ADDRESS: 'آدرس فیزیکی',
  BANK_ACCOUNT: 'حساب بانکی',
};

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'UNDER_REVIEW', label: 'در حال بررسی' },
  { value: 'APPROVED', label: 'تأییدشده' },
  { value: 'REJECTED', label: 'رد‌شده' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'همه انواع' },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const PAGE_SIZE = 20;

function statusBadge(status: string) {
  if (status === 'APPROVED')
    return (
      <Badge tone="success" size="sm">
        تأییدشده
      </Badge>
    );
  if (status === 'REJECTED')
    return (
      <Badge tone="destructive" size="sm">
        رد‌شده
      </Badge>
    );
  if (status === 'UNDER_REVIEW')
    return (
      <Badge tone="warning" size="sm">
        در حال بررسی
      </Badge>
    );
  return (
    <Badge tone="neutral" size="sm">
      در انتظار
    </Badge>
  );
}

function VerificationsInner() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [rejectTarget, setRejectTarget] = useState<VerificationItem | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'verifications', page, statusFilter, typeFilter],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: VerificationItem[];
          total: number;
          page: number;
          pageSize: number;
        }>('/admin/verifications', {
          page,
          pageSize: PAGE_SIZE,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        })
      ).data,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.post(`/admin/verifications/${id}/approve`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('تأیید شد');
      qc.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const r = await apiClient.post(`/admin/verifications/${id}/reject`, { note });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('رد شد');
      setRejectTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const columns: Array<Column<VerificationItem>> = useMemo(
    () => [
      {
        key: 'shop',
        header: 'فروشگاه',
        cell: (item) => (
          <Link
            href={`/verifications/${item.id}`}
            className="flex items-center gap-2 hover:bg-muted/40 -m-2 p-2 rounded-md"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold">{item.shop.name}</div>
              <div className="text-xs text-muted-foreground">@{item.shop.user.username ?? '—'}</div>
            </div>
          </Link>
        ),
      },
      {
        key: 'type',
        header: 'نوع',
        cell: (item) => (
          <Badge tone="brand" size="sm">
            {TYPE_LABELS[item.type] ?? item.type}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (item) => statusBadge(item.status),
      },
      {
        key: 'documents',
        header: 'مستندات',
        hideOnMobile: true,
        cell: (item) =>
          item.documents.length > 0 ? (
            <div className="flex gap-1">
              {item.documents.map((doc, i) => (
                <a
                  key={i}
                  href={doc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  سند {i + 1}
                </a>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: 'createdAt',
        header: 'تاریخ ثبت',
        hideOnMobile: true,
        cell: (item) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatJalaliDate(item.createdAt, 'medium')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (item) =>
          item.status === 'PENDING' || item.status === 'UNDER_REVIEW' ? (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  approveMutation.mutate(item.id);
                }}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="size-3.5 me-1" />
                تأیید
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectTarget(item);
                }}
              >
                <XCircle className="size-3.5 me-1" />
                رد
              </Button>
            </div>
          ) : null,
      },
    ],
    [approveMutation],
  );

  if (isError) {
    return (
      <Shell>
        <div className="mb-6">
          <h1 className="text-h2 font-extrabold tracking-tight">تأییدیه‌ها</h1>
        </div>
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-h2 font-extrabold tracking-tight">تأییدیه‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          بررسی و مدیریت درخواست‌های تأییدیه فروشگاه‌ها
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر وضعیت"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر نوع"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {(statusFilter || typeFilter) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter('');
                  setTypeFilter('');
                  setPage(1);
                }}
              >
                پاک‌سازی فیلترها
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(item) => item.id}
        isLoading={isLoading}
        emptyIcon={<ShieldCheck className="size-7" aria-hidden />}
        emptyTitle="تأییدیه‌ای یافت نشد"
        emptyDescription="درخواست تأییدیه‌ای وجود ندارد."
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title="رد درخواست تأییدیه"
        description={
          rejectTarget
            ? `درخواست «${TYPE_LABELS[rejectTarget.type] ?? rejectTarget.type}» رد شود؟`
            : ''
        }
        confirmLabel="رد کردن"
        tone="destructive"
        reasonLabel="دلیل رد"
        reasonPlaceholder="دلیل رد را وارد کنید…"
        reasonRequired
        isLoading={rejectMutation.isPending}
        onConfirm={(note) => {
          if (rejectTarget && note) {
            rejectMutation.mutate({ id: rejectTarget.id, note });
          }
        }}
      />
    </Shell>
  );
}

export default function VerificationsPage() {
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
      <VerificationsInner />
    </Suspense>
  );
}
