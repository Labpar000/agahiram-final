'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Ban, Check, Search, Shield, Store, UserRound } from 'lucide-react';
import { formatJalaliDate, formatPhoneFa } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  IconButton,
  Input,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { apiClient } from '@/lib/api';
import { DataTable, type Column } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface User {
  id: string;
  username: string | null;
  name: string | null;
  phone: string;
  avatar: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isBanned: boolean;
  role: string;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [banConfirm, setBanConfirm] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', q, page],
    queryFn: async () =>
      (
        await apiClient.get<{ data: User[]; total?: number; page?: number; pageSize?: number }>(
          '/admin/users',
          {
            q,
            page,
            pageSize: PAGE_SIZE,
          },
        )
      ).data,
  });

  const action = useMutation({
    mutationFn: async ({
      id,
      kind,
      value,
      reason,
    }: {
      id: string;
      kind: 'ban' | 'unban' | 'verify' | 'business';
      value?: boolean;
      reason?: string;
    }) => {
      let r;
      if (kind === 'ban') r = await apiClient.post(`/admin/users/${id}/ban`, { reason });
      else if (kind === 'unban') r = await apiClient.post(`/admin/users/${id}/unban`);
      else if (kind === 'verify') r = await apiClient.post(`/admin/users/${id}/verify`);
      else r = await apiClient.post(`/admin/users/${id}/business`, { value });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const columns: Array<Column<User>> = useMemo(
    () => [
      {
        key: 'user',
        header: 'کاربر',
        cell: (u) => (
          <Link
            href={`/users/${u.id}`}
            className="flex items-center gap-3 hover:bg-muted/40 -m-2 p-2 rounded-md"
          >
            <Avatar size="sm" verified={u.isVerified}>
              {u.avatar ? <AvatarImage src={u.avatar} alt="" /> : null}
              <AvatarFallback>{(u.username ?? u.name ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="truncate">{u.name ?? u.username ?? '—'}</span>
                {u.isBusiness ? (
                  <Store className="size-3.5 text-warning-foreground" aria-hidden />
                ) : null}
                {u.role === 'admin' ? (
                  <Shield className="size-3.5 text-primary" aria-hidden />
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">@{u.username ?? '—'}</div>
            </div>
          </Link>
        ),
      },
      {
        key: 'phone',
        header: 'شماره',
        hideOnMobile: true,
        cell: (u) => (
          <span className="font-mono text-xs tabular-nums" dir="ltr">
            {formatPhoneFa(u.phone)}
          </span>
        ),
      },
      {
        key: 'role',
        header: 'نقش',
        hideOnMobile: true,
        cell: (u) => (
          <Badge tone={u.role === 'admin' ? 'brand' : 'neutral'} size="sm">
            {u.role === 'admin' ? 'ادمین' : 'کاربر'}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        cell: (u) =>
          u.isBanned ? (
            <Badge tone="destructive" size="sm" icon={<Ban className="size-3" aria-hidden />}>
              مسدود
            </Badge>
          ) : u.isVerified ? (
            <Badge tone="brand" size="sm" icon={<BadgeCheck className="size-3" aria-hidden />}>
              تأییدشده
            </Badge>
          ) : (
            <Badge tone="neutral" size="sm">
              عادی
            </Badge>
          ),
      },
      {
        key: 'createdAt',
        header: 'تاریخ ثبت‌نام',
        hideOnMobile: true,
        cell: (u) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatJalaliDate(u.createdAt, 'medium')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (u) => (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  aria-label={u.isBanned ? 'رفع مسدودی' : 'مسدودسازی'}
                  size="sm"
                  variant={u.isBanned ? 'outline' : 'ghost'}
                  icon={<Ban className="size-4" aria-hidden />}
                  className={u.isBanned ? '' : 'text-destructive hover:bg-destructive/10'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (u.isBanned) action.mutate({ id: u.id, kind: 'unban' });
                    else setBanConfirm(u);
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{u.isBanned ? 'رفع مسدودی' : 'مسدودسازی'}</TooltipContent>
            </Tooltip>
            {!u.isVerified ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    aria-label="تأیید کاربر"
                    size="sm"
                    variant="ghost"
                    icon={<Check className="size-4" aria-hidden />}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.mutate({ id: u.id, kind: 'verify' });
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>تأیید کاربر</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  aria-label="تغییر وضعیت فروشگاهی"
                  size="sm"
                  variant={u.isBusiness ? 'secondary' : 'ghost'}
                  icon={<Store className="size-4" aria-hidden />}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.mutate({ id: u.id, kind: 'business', value: !u.isBusiness });
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {u.isBusiness ? 'حذف از فروشگاهی' : 'ارتقا به فروشگاهی'}
              </TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
    [action],
  );

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight">کاربران</h1>
          <p className="mt-1 text-sm text-muted-foreground">مدیریت حساب‌های کاربری پلتفرم</p>
        </div>
        <div className="w-full md:w-80">
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="جستجو نام، نام کاربری، شماره…"
            leadingIcon={<Search className="size-4" aria-hidden />}
            aria-label="جستجوی کاربران"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        emptyIcon={<UserRound className="size-7" aria-hidden />}
        emptyTitle="کاربری یافت نشد"
        emptyDescription="نتیجه‌ای برای جستجوی شما پیدا نشد."
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? data?.data?.length ?? 0}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!banConfirm}
        onOpenChange={(o) => !o && setBanConfirm(null)}
        title="مسدودسازی کاربر"
        description={banConfirm ? `حساب «@${banConfirm.username}» مسدود شود؟` : null}
        confirmLabel="مسدودسازی"
        tone="destructive"
        reasonLabel="دلیل مسدودسازی"
        reasonPlaceholder="مثلاً: نقض قوانین جامعه…"
        reasonRequired
        isLoading={action.isPending}
        onConfirm={(reason) => {
          if (banConfirm) {
            action.mutate({ id: banConfirm.id, kind: 'ban', reason });
            setBanConfirm(null);
          }
        }}
      />
    </Shell>
  );
}
