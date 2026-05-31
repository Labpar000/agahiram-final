'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  Flag,
  Hourglass,
  Pencil,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { formatJalaliDate, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  Textarea,
  toast,
} from '@agahiram/ui';
import Shell from '../../layout-shell';
import { PageHeader } from '@/components/page-header';
import {
  PostStatusBadge,
  PaymentStatusBadge,
  paymentPurposeLabel,
} from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface PostDetail {
  id: string;
  title: string;
  description: string | null;
  price: number | string | null;
  priceType: string;
  status: string;
  type: string;
  isPromoted: boolean;
  boostExpiresAt: string | null;
  viewCount: number;
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    phone: string;
    isVerified: boolean;
    isBusiness: boolean;
  };
  category: { id: string; name: string };
  city: { id: string; name: string; province: { name: string } } | null;
  neighborhood: { id: string; name: string } | null;
  media: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    type: string;
    hlsUrl: string | null;
  }>;
  attributes: Array<{ value: string; attribute: { label: string } }>;
  payments: Array<{
    id: string;
    amount: number | string;
    purpose: string;
    status: string;
    refId: string | null;
    createdAt: string;
    plan: { name: string } | null;
  }>;
  reports: Array<{
    id: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
    reporter: { id: string; username: string | null; name: string | null };
  }>;
  _count: { likes: number; comments: number; saves: number };
}

const POST_STATUS_OPTIONS = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'pendingReview', label: 'در انتظار تأیید' },
  { value: 'approved', label: 'منتشرشده' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'sold', label: 'فروخته‌شده' },
  { value: 'expired', label: 'منقضی' },
  { value: 'deleted', label: 'حذف‌شده' },
];

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<
    | { type: 'approve' }
    | { type: 'reject' }
    | { type: 'delete' }
    | { type: 'promote' }
    | { type: 'expire' }
    | null
  >(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    price: '',
    status: '',
  });
  const [promoteHours, setPromoteHours] = useState('24');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'post', id],
    queryFn: async () => (await apiClient.get<PostDetail>(`/admin/posts/${id}`)).data!,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'post', id] });

  const action = useMutation({
    mutationFn: async ({
      type,
      reason,
    }: {
      type: 'approve' | 'reject' | 'delete' | 'expire';
      reason?: string;
    }) => {
      if (type === 'approve') return apiClient.post(`/admin/posts/${id}/approve`);
      if (type === 'reject') return apiClient.post(`/admin/posts/${id}/reject`, { reason });
      if (type === 'delete') return apiClient.delete(`/admin/posts/${id}`, { reason });
      return apiClient.post(`/admin/posts/${id}/expire`);
    },
    onSuccess: (r) => {
      if (!r.success) {
        toast.error(r.error ?? 'خطا');
        return;
      }
      toast.success('ذخیره شد');
      setConfirm(null);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const promote = useMutation({
    mutationFn: async (hours: number) => {
      const r = await apiClient.post(`/admin/posts/${id}/promote`, { hours });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('نردبان فعال شد');
      setConfirm(null);
      setPromoteHours('24');
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const patchPost = useMutation({
    mutationFn: async (body: {
      title?: string;
      description?: string | null;
      price?: number | null;
      status?: string;
    }) => {
      const r = await apiClient.patch(`/admin/posts/${id}`, body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setEditOpen(false);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const markSold = useMutation({
    mutationFn: async () => {
      const r = await apiClient.patch(`/admin/posts/${id}`, { status: 'sold' });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('وضعیت به «فروخته‌شده» تغییر کرد');
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const openEdit = () => {
    if (!data) return;
    setEditForm({
      title: data.title,
      description: data.description ?? '',
      price: data.price != null ? String(Number(data.price)) : '',
      status: data.status,
    });
    setEditOpen(true);
  };

  const submitEdit = () => {
    const title = editForm.title.trim();
    if (title.length < 3) {
      toast.error('عنوان باید حداقل ۳ کاراکتر باشد');
      return;
    }
    const price = editForm.price.trim() === '' ? null : Number.parseInt(editForm.price, 10);
    if (editForm.price.trim() !== '' && (Number.isNaN(price) || price! < 0)) {
      toast.error('قیمت نامعتبر است');
      return;
    }
    patchPost.mutate({
      title,
      description: editForm.description.trim() || null,
      price,
      status: editForm.status,
    });
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  }
  if (isError || !data) {
    return (
      <Shell>
        <div className="py-16 text-center text-sm text-muted-foreground">
          آگهی پیدا نشد.
          <div className="mt-4">
            <Link href="/posts" className="text-primary hover:underline">
              بازگشت به لیست
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Link
              href="/posts"
              className="text-muted-foreground hover:text-foreground"
              aria-label="بازگشت"
            >
              <ArrowLeft className="size-5 rtl:rotate-180" />
            </Link>
            <span className="truncate max-w-[600px]">{data.title}</span>
            <PostStatusBadge status={data.status} />
            {data.isPromoted ? (
              <Badge tone="warning" icon={<Sparkles className="size-3" />} size="sm">
                نردبان
              </Badge>
            ) : null}
          </span>
        }
        description={
          <span className="text-xs">
            ایجاد {formatJalaliDate(data.createdAt, 'dateTime')} ·{' '}
            <span className="font-mono">{data.id.slice(0, 8)}…</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="size-4" />}
              onClick={openEdit}
            >
              ویرایش
            </Button>
            {data.status === 'pendingReview' ? (
              <Button
                variant="brand"
                size="sm"
                leftIcon={<Check className="size-4" />}
                onClick={() => setConfirm({ type: 'approve' })}
              >
                تأیید
              </Button>
            ) : null}
            {data.status !== 'rejected' && data.status !== 'deleted' ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<X className="size-4" />}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirm({ type: 'reject' })}
              >
                رد
              </Button>
            ) : null}
            {data.status === 'approved' && !data.isPromoted ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Sparkles className="size-4" />}
                onClick={() => setConfirm({ type: 'promote' })}
              >
                نردبان
              </Button>
            ) : null}
            {data.status === 'approved' ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Hourglass className="size-4" />}
                onClick={() => setConfirm({ type: 'expire' })}
              >
                منقضی
              </Button>
            ) : null}
            {data.status === 'approved' ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Tag className="size-4" />}
                isLoading={markSold.isPending}
                onClick={() => markSold.mutate()}
              >
                فروخته شد
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Trash2 className="size-4" />}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirm({ type: 'delete' })}
            >
              حذف
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Media gallery */}
          {data.media.length > 0 ? (
            <Card>
              <CardContent className="!p-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {data.media.map((m) =>
                    m.type === 'video' ? (
                      <video
                        key={m.id}
                        src={m.url}
                        poster={m.thumbnailUrl ?? undefined}
                        controls
                        className="aspect-square w-full rounded-lg bg-black object-cover"
                      />
                    ) : (
                      <div
                        key={m.id}
                        className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                      >
                        <Image
                          src={m.thumbnailUrl ?? m.url}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Description + attributes */}
          <Card>
            <CardContent className="!p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-extrabold tabular-nums gradient-text-brand">
                  {data.price != null ? formatPersianPrice(Number(data.price)) : 'توافقی'}
                </span>
                <Badge tone="neutral" size="sm">
                  {data.category.name}
                </Badge>
                {data.city ? (
                  <Badge tone="neutral" size="sm">
                    {data.city.name}
                    {data.neighborhood ? `، ${data.neighborhood.name}` : ''}
                  </Badge>
                ) : null}
              </div>
              {data.description ? (
                <p className="whitespace-pre-wrap text-sm leading-7">{data.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">توضیحات ندارد.</p>
              )}
              {data.attributes.length > 0 ? (
                <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 pt-2 border-t border-border">
                  {data.attributes.map((a, i) => (
                    <div key={i}>
                      <dt className="text-[11px] text-muted-foreground">{a.attribute.label}</dt>
                      <dd className="text-sm font-medium">{a.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {data.rejectionReason ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <div className="font-semibold text-destructive">دلیل رد/حذف</div>
                  <div className="mt-1 text-muted-foreground">{data.rejectionReason}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Reports */}
          {data.reports.length > 0 ? (
            <Card>
              <CardContent className="!p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Flag className="size-4 text-warning-foreground" />
                  <h2 className="text-sm font-bold">
                    گزارش‌ها ({formatPersianNumber(data.reports.length)})
                  </h2>
                </div>
                <ul className="space-y-2">
                  {data.reports.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-md border border-border bg-background p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <Badge tone="warning" size="sm">
                          {r.reason}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatJalaliDate(r.createdAt, 'dateTime')}
                        </span>
                      </div>
                      {r.details ? <p className="mt-1 text-muted-foreground">{r.details}</p> : null}
                      <div className="mt-1 text-[11px]">
                        گزارش‌دهنده:{' '}
                        <Link
                          href={`/users/${r.reporter.id}`}
                          className="text-primary hover:underline"
                        >
                          @{r.reporter.username ?? '—'}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Payments */}
          {data.payments.length > 0 ? (
            <Card>
              <CardContent className="!p-5 space-y-3">
                <h2 className="text-sm font-bold">پرداخت‌های مرتبط</h2>
                <ul className="space-y-2">
                  {data.payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-3 text-sm"
                    >
                      <span className="font-semibold tabular-nums">
                        {formatPersianPrice(Number(p.amount))}
                      </span>
                      <Badge tone="neutral" size="sm">
                        {paymentPurposeLabel(p.purpose)}
                      </Badge>
                      <PaymentStatusBadge status={p.status} />
                      {p.plan ? (
                        <span className="text-muted-foreground text-xs">— {p.plan.name}</span>
                      ) : null}
                      {p.refId ? (
                        <span className="text-[11px] text-muted-foreground" dir="ltr">
                          ref:{p.refId}
                        </span>
                      ) : null}
                      <span className="ms-auto text-[11px] text-muted-foreground tabular-nums">
                        {formatJalaliDate(p.createdAt, 'dateTime')}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {/* Seller card */}
          <Card>
            <CardContent className="!p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                فروشنده
              </h2>
              <Link
                href={`/users/${data.user.id}`}
                className="flex items-center gap-3 hover:underline"
              >
                <Avatar size="md" verified={data.user.isVerified}>
                  {data.user.avatar ? <AvatarImage src={data.user.avatar} alt="" /> : null}
                  <AvatarFallback>
                    {(data.user.username ?? data.user.name ?? '?').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {data.user.name ?? data.user.username ?? '—'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{data.user.username ?? '—'}
                  </div>
                </div>
              </Link>
              <div className="text-xs space-y-1.5 pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">شماره</span>
                  <span dir="ltr" className="font-mono">
                    {data.user.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">نوع</span>
                  <span>
                    {data.user.isBusiness ? 'فروشگاهی' : 'عادی'}
                    {data.user.isVerified ? ' · تأییدشده' : ''}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="!p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                آمار
              </h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <StatPill icon={<Eye className="size-4" />} label="بازدید" value={data.viewCount} />
                <StatPill
                  icon={<Flag className="size-4" />}
                  label="گزارش"
                  value={data.reports.length}
                />
                <StatPill
                  icon={<Check className="size-4" />}
                  label="لایک"
                  value={data._count.likes}
                />
                <StatPill
                  icon={<Clock className="size-4" />}
                  label="کامنت"
                  value={data._count.comments}
                />
              </div>
              {data.boostExpiresAt ? (
                <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground">
                  نردبان تا {formatJalaliDate(data.boostExpiresAt, 'dateTime')}
                </div>
              ) : null}
              {data.expiresAt ? (
                <div className="rounded-md border border-border p-2 text-[11px] text-muted-foreground">
                  انقضای آگهی: {formatJalaliDate(data.expiresAt, 'medium')}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm?.type === 'approve'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="تأیید آگهی"
        description={`«${data.title}» منتشر شود؟`}
        confirmLabel="تأیید"
        tone="brand"
        isLoading={action.isPending}
        onConfirm={() => action.mutate({ type: 'approve' })}
      />
      <ConfirmDialog
        open={confirm?.type === 'reject'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="رد آگهی"
        description={`«${data.title}» رد شود؟ کاربر دلیل را خواهد دید.`}
        confirmLabel="رد"
        tone="destructive"
        reasonLabel="دلیل رد"
        reasonRequired
        isLoading={action.isPending}
        onConfirm={(reason) => reason && action.mutate({ type: 'reject', reason })}
      />
      <ConfirmDialog
        open={confirm?.type === 'delete'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف آگهی"
        description="آگهی حذف و از موتور جستجو هم پاک می‌شود."
        confirmLabel="حذف"
        tone="destructive"
        reasonLabel="دلیل حذف"
        reasonRequired
        isLoading={action.isPending}
        onConfirm={(reason) => reason && action.mutate({ type: 'delete', reason })}
      />
      <Dialog
        open={confirm?.type === 'promote'}
        onOpenChange={(o) => {
          if (!o) {
            setConfirm(null);
            setPromoteHours('24');
          }
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>فعال‌سازی نردبان</DialogTitle>
            <DialogDescription>
              مدت زمان نردبان را به ساعت وارد کنید. پیش‌فرض ۲۴ ساعت است.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="promote-hours" required>
              مدت (ساعت)
            </Label>
            <Input
              id="promote-hours"
              type="number"
              min={1}
              max={8760}
              value={promoteHours}
              onChange={(e) => setPromoteHours(e.target.value)}
              dir="ltr"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirm(null);
                setPromoteHours('24');
              }}
              disabled={promote.isPending}
            >
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={promote.isPending}
              disabled={!promoteHours || Number(promoteHours) < 1}
              onClick={() => promote.mutate(Number(promoteHours))}
            >
              فعال‌سازی
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>ویرایش آگهی</DialogTitle>
            <DialogDescription>عنوان، توضیحات، قیمت و وضعیت آگهی را ویرایش کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" required>
                عنوان
              </Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">توضیحات</Label>
              <Textarea
                id="edit-description"
                autoGrow
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">قیمت (تومان)</Label>
              <Input
                id="edit-price"
                type="number"
                min={0}
                placeholder="خالی = توافقی"
                value={editForm.price}
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">وضعیت</Label>
              <select
                id="edit-status"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
              >
                {POST_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={patchPost.isPending}
            >
              انصراف
            </Button>
            <Button variant="brand" isLoading={patchPost.isPending} onClick={submitEdit}>
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm?.type === 'expire'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="منقضی‌سازی آگهی"
        description="وضعیت آگهی به «منقضی» تغییر می‌کند و از فید کنار می‌رود."
        confirmLabel="منقضی"
        tone="destructive"
        isLoading={action.isPending}
        onConfirm={() => action.mutate({ type: 'expire' })}
      />
    </Shell>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
        <div className="text-sm font-bold tabular-nums">{formatPersianNumber(value)}</div>
      </div>
    </div>
  );
}
