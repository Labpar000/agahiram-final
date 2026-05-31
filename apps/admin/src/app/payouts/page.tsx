'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Wallet, X, XCircle } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  IconButton,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type Column } from '@/components/data-table';
import { apiClient } from '@/lib/api';

interface Payout {
  id: string;
  amount: number | string;
  cardNumber: string | null;
  iban: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  rejectReason: string | null;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; phone: string };
}

const PAGE_SIZE = 30;

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'approved', label: 'تأییدشده' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'paid', label: 'پرداخت‌شده' },
];

const STATUS_LABEL: Record<
  string,
  { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'destructive' }
> = {
  pending: { label: 'در انتظار', tone: 'warning' },
  approved: { label: 'تأییدشده', tone: 'brand' },
  rejected: { label: 'رد شده', tone: 'destructive' },
  paid: { label: 'پرداخت‌شده', tone: 'success' },
};

type ConfirmState =
  | { type: 'approve'; payout: Payout }
  | { type: 'reject'; payout: Payout }
  | { type: 'paid'; payout: Payout }
  | null;

export default function PayoutsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const list = useQuery({
    queryKey: ['admin', 'payouts', { page, status }],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: Payout[];
          total: number;
          page: number;
          pageSize: number;
        }>('/admin/payouts', { page, pageSize: PAGE_SIZE, status })
      ).data,
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.post(`/admin/payouts/${id}/approve`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('درخواست تسویه تأیید شد');
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const r = await apiClient.post(`/admin/payouts/${id}/reject`, { reason });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('درخواست تسویه رد شد');
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.post(`/admin/payouts/${id}/paid`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('پرداخت ثبت شد');
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const isLoading = approve.isPending || reject.isPending || markPaid.isPending;

  const columns: Column<Payout>[] = useMemo(
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
            <div className="min-w-0">
              <div className="text-xs font-medium">@{p.user.username ?? '—'}</div>
              <div dir="ltr" className="text-[10px] text-muted-foreground">
                {p.user.phone}
              </div>
            </div>
          </Link>
        ),
      },
      {
        key: 'bank',
        header: 'حساب',
        hideOnMobile: true,
        cell: (p) => (
          <div dir="ltr" className="text-[11px] text-muted-foreground font-mono">
            {p.iban ? <div>{p.iban}</div> : null}
            {p.cardNumber ? <div>{p.cardNumber}</div> : null}
            {!p.iban && !p.cardNumber ? '—' : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (p) => {
          const cfg = STATUS_LABEL[p.status] ?? { label: p.status, tone: 'neutral' as const };
          return (
            <div>
              <Badge tone={cfg.tone} size="sm">
                {cfg.label}
              </Badge>
              {p.rejectReason ? (
                <div className="mt-1 max-w-[160px] truncate text-[10px] text-muted-foreground">
                  {p.rejectReason}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
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
        cell: (p) => (
          <div className="flex justify-end gap-1">
            {p.status === 'pending' ? (
              <>
                <IconButton
                  aria-label="تأیید"
                  size="sm"
                  variant="ghost"
                  className="text-success hover:bg-success/10"
                  icon={<Check className="size-4" />}
                  onClick={() => setConfirm({ type: 'approve', payout: p })}
                />
                <IconButton
                  aria-label="رد"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  icon={<XCircle className="size-4" />}
                  onClick={() => setConfirm({ type: 'reject', payout: p })}
                />
              </>
            ) : null}
            {p.status === 'approved' ? (
              <Button
                size="sm"
                variant="brand"
                onClick={() => setConfirm({ type: 'paid', payout: p })}
              >
                ثبت پرداخت
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <Shell adminOnly>
      <PageHeader title="تسویه‌ها" description="مدیریت درخواست‌های برداشت از کیف پول" />

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
            {status ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setStatus('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
            <div className="ms-auto text-xs text-muted-foreground tabular-nums">
              {formatPersianNumber(total)} نتیجه
            </div>
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
        total={total}
        onPageChange={setPage}
        emptyTitle="درخواست تسویه‌ای پیدا نشد"
        emptyIcon={<Wallet className="size-7" />}
      />

      <ConfirmDialog
        open={confirm?.type === 'approve'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="تأیید درخواست تسویه"
        description={
          confirm?.type === 'approve'
            ? `مبلغ ${formatPersianPrice(Number(confirm.payout.amount))} از کیف پول @${confirm.payout.user.username ?? '—'} کسر و درخواست تأیید می‌شود.`
            : null
        }
        confirmLabel="تأیید"
        tone="brand"
        isLoading={isLoading}
        onConfirm={() => {
          if (confirm?.type === 'approve') approve.mutate(confirm.payout.id);
        }}
      />

      <ConfirmDialog
        open={confirm?.type === 'reject'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="رد درخواست تسویه"
        description={
          confirm?.type === 'reject'
            ? `درخواست ${formatPersianPrice(Number(confirm.payout.amount))} برای @${confirm.payout.user.username ?? '—'} رد می‌شود.`
            : null
        }
        confirmLabel="رد"
        tone="destructive"
        reasonLabel="دلیل رد (اجباری)"
        reasonRequired
        isLoading={isLoading}
        onConfirm={(reason) => {
          if (confirm?.type === 'reject' && reason)
            reject.mutate({ id: confirm.payout.id, reason });
        }}
      />

      <ConfirmDialog
        open={confirm?.type === 'paid'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="ثبت پرداخت"
        description={
          confirm?.type === 'paid'
            ? `پرداخت ${formatPersianPrice(Number(confirm.payout.amount))} به @${confirm.payout.user.username ?? '—'} در سیستم ثبت می‌شود.`
            : null
        }
        confirmLabel="ثبت پرداخت"
        tone="brand"
        isLoading={isLoading}
        onConfirm={() => {
          if (confirm?.type === 'paid') markPaid.mutate(confirm.payout.id);
        }}
      />
    </Shell>
  );
}
