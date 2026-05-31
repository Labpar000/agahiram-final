'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Ban, Check, Search, Shield, Store, UserRound, XCircle } from 'lucide-react';
import { formatJalaliDate, formatPhoneFa } from '@agahiram/shared';
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

const ROLE_OPTIONS = [
  { value: '', label: 'همه نقش‌ها' },
  { value: 'user', label: 'کاربر' },
  { value: 'moderator', label: 'ناظر' },
  { value: 'admin', label: 'ادمین' },
];

const BOOL_FILTER_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'true', label: 'بله' },
  { value: 'false', label: 'خیر' },
];

function roleLabel(role: string) {
  if (role === 'admin') return 'ادمین';
  if (role === 'moderator') return 'ناظر';
  return 'کاربر';
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [isBanned, setIsBanned] = useState('');
  const [isVerified, setIsVerified] = useState('');
  const [isBusiness, setIsBusiness] = useState('');
  const [banConfirm, setBanConfirm] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', q, page, role, isBanned, isVerified, isBusiness],
    queryFn: async () =>
      (
        await apiClient.get<{ data: User[]; total?: number; page?: number; pageSize?: number }>(
          '/admin/users',
          {
            q,
            page,
            pageSize: PAGE_SIZE,
            role: role || undefined,
            isBanned: isBanned === '' ? undefined : isBanned === 'true',
            isVerified: isVerified === '' ? undefined : isVerified === 'true',
            isBusiness: isBusiness === '' ? undefined : isBusiness === 'true',
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
      kind: 'ban' | 'unban' | 'verify' | 'unverify' | 'business';
      value?: boolean;
      reason?: string;
    }) => {
      let r;
      if (kind === 'ban') r = await apiClient.post(`/admin/users/${id}/ban`, { reason });
      else if (kind === 'unban') r = await apiClient.post(`/admin/users/${id}/unban`);
      else if (kind === 'verify') r = await apiClient.post(`/admin/users/${id}/verify`);
      else if (kind === 'unverify')
        r = await apiClient.patch(`/admin/users/${id}`, { isVerified: false });
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
                ) : u.role === 'moderator' ? (
                  <Shield className="size-3.5 text-warning-foreground" aria-hidden />
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
          <Badge
            tone={u.role === 'admin' ? 'brand' : u.role === 'moderator' ? 'warning' : 'neutral'}
            size="sm"
          >
            {roleLabel(u.role)}
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
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    aria-label="لغو تأیید"
                    size="sm"
                    variant="ghost"
                    icon={<XCircle className="size-4" aria-hidden />}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.mutate({ id: u.id, kind: 'unverify' });
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>لغو تأیید</TooltipContent>
              </Tooltip>
            )}
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

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر نقش"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={isBanned}
              onChange={(e) => {
                setIsBanned(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر مسدود"
            >
              <option value="">مسدود: همه</option>
              {BOOL_FILTER_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>
                  مسدود: {o.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={isVerified}
              onChange={(e) => {
                setIsVerified(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر تأییدشده"
            >
              <option value="">تأیید: همه</option>
              {BOOL_FILTER_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>
                  تأیید: {o.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={isBusiness}
              onChange={(e) => {
                setIsBusiness(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر فروشگاهی"
            >
              <option value="">فروشگاهی: همه</option>
              {BOOL_FILTER_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>
                  فروشگاهی: {o.label}
                </option>
              ))}
            </select>
            {role || isBanned || isVerified || isBusiness ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRole('');
                  setIsBanned('');
                  setIsVerified('');
                  setIsBusiness('');
                  setPage(1);
                }}
              >
                پاک‌سازی فیلترها
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

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
