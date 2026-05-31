'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Coins, RotateCcw, Search, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  IconButton,
  Input,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { PaymentStatusBadge, paymentPurposeLabel } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

interface Payment {
  id: string;
  amount: number | string;
  purpose: string;
  status: string;
  refId: string | null;
  authority: string | null;
  gateway: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    phone: string;
  };
  plan: { id: string; name: string } | null;
  post: { id: string; title: string } | null;
}

const PAGE_SIZE = 30;

const STATUS_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'pending', label: 'در حال انجام' },
  { value: 'success', label: 'موفق' },
  { value: 'failed', label: 'ناموفق' },
  { value: 'refunded', label: 'بازگشت‌داده' },
];

const PURPOSE_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'boost', label: 'نردبان' },
  { value: 'businessAccount', label: 'اکانت فروشگاهی' },
  { value: 'walletTopup', label: 'شارژ کیف پول' },
];

function PaymentsInner() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const { me } = useAuth();
  const isAdmin = me?.role === 'admin';

  const initialUserId = params.get('userId') ?? '';
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [userId, setUserId] = useState(initialUserId);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refundFor, setRefundFor] = useState<Payment | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'payments', { page, status, purpose, userId, dateFrom, dateTo }],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: Payment[];
          total: number;
          sum: string;
        }>('/admin/payments', {
          page,
          pageSize: PAGE_SIZE,
          status,
          purpose,
          userId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
      ).data,
  });

  const refund = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const r = await apiClient.post(`/admin/payments/${id}/refund`, { reason });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('بازگشت داده شد');
      setRefundFor(null);
      qc.invalidateQueries({ queryKey: ['admin', 'payments'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = list.data?.data ?? [];

  const columns: Column<Payment>[] = useMemo(
    () => [
      {
        key: 'amount',
        header: 'مبلغ',
        cell: (p) => (
          <span className="font-extrabold text-sm tabular-nums gradient-text-brand">
            {formatPersianPrice(Number(p.amount))}
          </span>
        ),
      },
      {
        key: 'purpose',
        header: 'نوع',
        cell: (p) => (
          <Badge tone="neutral" size="sm">
            {paymentPurposeLabel(p.purpose)}
          </Badge>
        ),
      },
      {
        key: 'user',
        header: 'کاربر',
        cell: (p) => (
          <Link
            href={`/users/${p.user.id}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Avatar size="xs">
              <AvatarFallback>{(p.user.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-xs">@{p.user.username ?? '—'}</span>
          </Link>
        ),
      },
      {
        key: 'meta',
        header: 'جزئیات',
        hideOnMobile: true,
        cell: (p) => (
          <div className="text-[11px] text-muted-foreground">
            {p.plan ? <div>{p.plan.name}</div> : null}
            {p.post ? (
              <Link href={`/posts/${p.post.id}`} className="text-primary hover:underline">
                {p.post.title}
              </Link>
            ) : null}
            {p.refId ? (
              <div dir="ltr" className="font-mono">
                ref: {p.refId}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (p) => <PaymentStatusBadge status={p.status} />,
      },
      {
        key: 'date',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (p) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatJalaliDate(p.createdAt, 'dateTime')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (p) =>
          isAdmin && p.status === 'success' ? (
            <IconButton
              aria-label="بازگشت"
              size="sm"
              variant="ghost"
              icon={<RotateCcw className="size-4" />}
              onClick={() => setRefundFor(p)}
            />
          ) : null,
      },
    ],
    [isAdmin],
  );

  return (
    <Shell>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            پرداخت‌ها
            {list.data ? (
              <Badge tone="brand" size="md">
                {formatPersianPrice(Number(list.data.sum))}
              </Badge>
            ) : null}
          </span>
        }
        description="گزارش تراکنش‌ها، بازگشت، و آمار درآمد"
      />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
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
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                setPage(1);
              }}
            >
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="min-w-[200px] flex-1">
              <Input
                size="sm"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                placeholder="شناسه کاربر"
                dir="ltr"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            <div>
              <Input
                size="sm"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                aria-label="از تاریخ"
                dir="ltr"
              />
            </div>
            <div>
              <Input
                size="sm"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                aria-label="تا تاریخ"
                dir="ltr"
              />
            </div>
            {status || purpose || userId || dateFrom || dateTo ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setStatus('');
                  setPurpose('');
                  setUserId('');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        emptyTitle="پرداختی پیدا نشد"
        emptyIcon={<Coins className="size-7" />}
      />

      <ConfirmDialog
        open={!!refundFor}
        onOpenChange={(o) => !o && setRefundFor(null)}
        title="بازگشت تراکنش"
        description={
          refundFor
            ? `تراکنش ${formatPersianPrice(
                Number(refundFor.amount),
              )} برای @${refundFor.user.username ?? '—'} به‌صورت refunded علامت می‌خورد. اگر شارژ کیف پول باشد، از موجودی کاربر کسر می‌شود.`
            : null
        }
        confirmLabel="بازگشت"
        tone="destructive"
        reasonLabel="دلیل بازگشت"
        reasonRequired
        isLoading={refund.isPending}
        onConfirm={(reason) => {
          if (refundFor && reason) refund.mutate({ id: refundFor.id, reason });
        }}
      />
    </Shell>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsInner />
    </Suspense>
  );
}
