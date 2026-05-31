'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Ban,
  BadgeCheck,
  Check,
  Coins,
  ExternalLink,
  Flag,
  Pencil,
  Shield,
  Star,
  Store,
  Trash2,
  UserMinus,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  formatJalaliDate,
  formatPersianNumber,
  formatPersianPrice,
  formatPhoneFa,
} from '@agahiram/shared';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Label,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
import { useAuth } from '@/components/auth-provider';

interface UserDetail {
  user: {
    id: string;
    phone: string;
    name: string | null;
    username: string | null;
    bio: string | null;
    avatar: string | null;
    walletBalance: number | string;
    isVerified: boolean;
    isBusiness: boolean;
    isBanned: boolean;
    karma?: number;
    role: 'user' | 'admin' | 'moderator';
    defaultCity: { id: string; name: string } | null;
    createdAt: string;
    _count: {
      posts: number;
      payments: number;
      reports: number;
      followers: number;
      following: number;
    };
  };
  recentPosts: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    media: Array<{ url: string; thumbnailUrl: string | null }>;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number | string;
    purpose: string;
    status: string;
    createdAt: string;
    plan: { name: string } | null;
    post: { id: string; title: string } | null;
  }>;
  reportsAgainst: number;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { me } = useAuth();
  const isAdmin = me?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: async () => (await apiClient.get<UserDetail>(`/admin/users/${id}`)).data!,
  });

  const [banConfirm, setBanConfirm] = useState(false);
  const [unbanConfirm, setUnbanConfirm] = useState(false);
  const [editForm, setEditForm] = useState<null | {
    name: string;
    username: string;
    bio: string;
  }>(null);
  const [roleForm, setRoleForm] = useState<null | { role: 'user' | 'admin' | 'moderator' }>(null);
  const [walletForm, setWalletForm] = useState<null | {
    type: 'credit' | 'debit';
    amount: string;
    reason: string;
  }>(null);
  const [karmaForm, setKarmaForm] = useState<null | { karma: string; reason: string }>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'user', id] });

  const ban = useMutation({
    mutationFn: async (reason: string) => {
      const r = await apiClient.post(`/admin/users/${id}/ban`, { reason });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('کاربر مسدود شد');
      setBanConfirm(false);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const unban = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post(`/admin/users/${id}/unban`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('مسدودی برداشته شد');
      setUnbanConfirm(false);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleVerify = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post(`/admin/users/${id}/verify`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('تأیید شد');
      refresh();
    },
  });

  const unverify = useMutation({
    mutationFn: async () => {
      const r = await apiClient.patch(`/admin/users/${id}`, { isVerified: false });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('تأیید لغو شد');
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleBusiness = useMutation({
    mutationFn: async (value: boolean) => {
      const r = await apiClient.post(`/admin/users/${id}/business`, { value });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      refresh();
    },
  });

  const saveEdit = useMutation({
    mutationFn: async (body: { name: string; username: string; bio: string }) => {
      const r = await apiClient.patch(`/admin/users/${id}`, {
        name: body.name || null,
        username: body.username || null,
        bio: body.bio || null,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setEditForm(null);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const setRole = useMutation({
    mutationFn: async (role: 'user' | 'admin' | 'moderator') => {
      const r = await apiClient.post(`/admin/users/${id}/role`, { role });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('نقش تغییر کرد');
      setRoleForm(null);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const wallet = useMutation({
    mutationFn: async (input: { type: 'credit' | 'debit'; amount: number; reason: string }) => {
      const r = await apiClient.post(`/admin/users/${id}/wallet/${input.type}`, {
        amount: input.amount,
        reason: input.reason,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('عملیات کیف پول انجام شد');
      setWalletForm(null);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const adjustKarma = useMutation({
    mutationFn: async (input: { karma: number; reason: string }) => {
      const r = await apiClient.patch(`/admin/users/${id}/karma`, input);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('کارما به‌روز شد');
      setKarmaForm(null);
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const blocks = useQuery({
    queryKey: ['admin', 'user', id, 'blocks'],
    queryFn: async () =>
      (
        await apiClient.get<{
          blocked: Array<{
            id: string;
            blocked: { id: string; username: string | null; name: string | null };
          }>;
          blocking: Array<{
            id: string;
            blocker: { id: string; username: string | null; name: string | null };
          }>;
        }>(`/admin/users/${id}/blocks`)
      ).data,
  });

  const followers = useQuery({
    queryKey: ['admin', 'user', id, 'followers'],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: Array<{
            id: string;
            follower: { id: string; username: string | null; name: string | null };
          }>;
        }>(`/admin/users/${id}/followers`)
      ).data?.data ?? [],
  });

  const following = useQuery({
    queryKey: ['admin', 'user', id, 'following'],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: Array<{
            id: string;
            following: { id: string; username: string | null; name: string | null };
          }>;
        }>(`/admin/users/${id}/following`)
      ).data?.data ?? [],
  });

  const removeBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const r = await apiClient.delete(`/admin/blocks/${blockId}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('بلاک حذف شد');
      qc.invalidateQueries({ queryKey: ['admin', 'user', id, 'blocks'] });
    },
  });

  const removeFollow = useMutation({
    mutationFn: async (followId: string) => {
      const r = await apiClient.delete(`/admin/follows/${followId}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('فالو حذف شد');
      qc.invalidateQueries({ queryKey: ['admin', 'user', id, 'followers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', id, 'following'] });
      refresh();
    },
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <div className="py-16 text-center text-sm text-muted-foreground">کاربر پیدا نشد.</div>
      </Shell>
    );
  }

  const u = data.user;
  const roleLabel = u.role === 'admin' ? 'ادمین کل' : u.role === 'moderator' ? 'ناظر' : 'کاربر';

  return (
    <Shell>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Link
              href="/users"
              className="text-muted-foreground hover:text-foreground"
              aria-label="بازگشت"
            >
              <ArrowLeft className="size-5 rtl:rotate-180" />
            </Link>
            <span className="truncate max-w-[400px]">{u.name ?? u.username ?? '—'}</span>
            {u.role !== 'user' ? (
              <Badge tone="brand" size="sm" icon={<Shield className="size-3" />}>
                {roleLabel}
              </Badge>
            ) : null}
            {u.isBanned ? (
              <Badge tone="destructive" size="sm">
                مسدود
              </Badge>
            ) : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Pencil className="size-4" />}
              onClick={() =>
                setEditForm({
                  name: u.name ?? '',
                  username: u.username ?? '',
                  bio: u.bio ?? '',
                })
              }
            >
              ویرایش
            </Button>
            {!u.isVerified ? (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<BadgeCheck className="size-4" />}
                onClick={() => toggleVerify.mutate()}
                isLoading={toggleVerify.isPending}
              >
                تأیید
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<XCircle className="size-4" />}
                onClick={() => unverify.mutate()}
                isLoading={unverify.isPending}
              >
                لغو تأیید
              </Button>
            )}
            {isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Star className="size-4" />}
                onClick={() => setKarmaForm({ karma: String(u.karma ?? 0), reason: '' })}
              >
                کارما
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Store className="size-4" />}
              onClick={() => toggleBusiness.mutate(!u.isBusiness)}
              isLoading={toggleBusiness.isPending}
            >
              {u.isBusiness ? 'حذف از فروشگاهی' : 'فروشگاهی کن'}
            </Button>
            {isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Shield className="size-4" />}
                onClick={() => setRoleForm({ role: u.role })}
              >
                تغییر نقش
              </Button>
            ) : null}
            {u.isBanned ? (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Check className="size-4" />}
                onClick={() => setUnbanConfirm(true)}
              >
                رفع مسدودی
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Ban className="size-4" />}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setBanConfirm(true)}
              >
                مسدود
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardContent className="!p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar size="lg" verified={u.isVerified}>
                  {u.avatar ? <AvatarImage src={u.avatar} alt="" /> : null}
                  <AvatarFallback>{(u.name ?? u.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-bold truncate">{u.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground truncate">@{u.username ?? '—'}</div>
                </div>
              </div>
              {u.bio ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{u.bio}</p>
              ) : null}
              <dl className="space-y-1.5 text-sm">
                <Row
                  label="شماره"
                  value={
                    <span dir="ltr" className="font-mono">
                      {formatPhoneFa(u.phone)}
                    </span>
                  }
                />
                <Row label="نقش" value={roleLabel} />
                <Row
                  label="کارما"
                  value={
                    <span className="font-mono tabular-nums">
                      {formatPersianNumber(u.karma ?? 0)}
                    </span>
                  }
                />
                <Row
                  label="کیف پول"
                  value={
                    <span className="font-mono tabular-nums">
                      {formatPersianPrice(Number(u.walletBalance))}
                    </span>
                  }
                />
                <Row label="شهر پیش‌فرض" value={u.defaultCity?.name ?? '—'} />
                <Row label="تاریخ ثبت‌نام" value={formatJalaliDate(u.createdAt, 'medium')} />
              </dl>
              {isAdmin ? (
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Wallet className="size-4" />}
                    onClick={() => setWalletForm({ type: 'credit', amount: '', reason: '' })}
                  >
                    شارژ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Coins className="size-4" />}
                    onClick={() => setWalletForm({ type: 'debit', amount: '', reason: '' })}
                  >
                    کسر
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="!p-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="آگهی" value={u._count.posts} />
              <Stat label="پرداخت" value={u._count.payments} />
              <Stat label="گزارش‌داده" value={u._count.reports} />
              <Stat label="گزارش‌شده" value={data.reportsAgainst} />
              <Stat label="دنبال‌کننده" value={u._count.followers} />
              <Stat label="دنبال‌شده" value={u._count.following} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="posts">
            <TabsList className="mb-3 flex-wrap h-auto">
              <TabsTrigger value="posts">آگهی‌های اخیر</TabsTrigger>
              <TabsTrigger value="payments">پرداخت‌ها</TabsTrigger>
              <TabsTrigger value="blocks">بلاک‌ها</TabsTrigger>
              <TabsTrigger value="followers">دنبال‌کنندگان</TabsTrigger>
              <TabsTrigger value="following">دنبال‌شده‌ها</TabsTrigger>
            </TabsList>
            <TabsContent value="posts">
              <Card>
                <CardContent className="!p-3 space-y-1">
                  {data.recentPosts.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      هیچ آگهی‌ای ثبت نکرده.
                    </div>
                  ) : (
                    data.recentPosts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/posts/${p.id}`}
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
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
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{p.title}</div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            {formatJalaliDate(p.createdAt, 'short')}
                          </div>
                        </div>
                        <PostStatusBadge status={p.status} />
                        <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
                      </Link>
                    ))
                  )}
                  <div className="pt-2 text-center">
                    <Link
                      href={`/posts?userId=${u.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      نمایش همه‌ی آگهی‌ها →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="payments">
              <Card>
                <CardContent className="!p-3 space-y-1">
                  {data.recentPayments.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      پرداختی ثبت نشده.
                    </div>
                  ) : (
                    data.recentPayments.map((p) => (
                      <div
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
                        {p.post ? (
                          <Link
                            href={`/posts/${p.post.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {p.post.title}
                          </Link>
                        ) : null}
                        <span className="ms-auto text-[11px] text-muted-foreground tabular-nums">
                          {formatJalaliDate(p.createdAt, 'dateTime')}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="pt-2 text-center">
                    <Link
                      href={`/payments?userId=${u.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      نمایش همه‌ی پرداخت‌ها →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="blocks">
              <Card>
                <CardContent className="!p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold mb-2">
                      بلاک کرده ({formatPersianNumber(blocks.data?.blocked.length ?? 0)})
                    </h3>
                    <ul className="space-y-1">
                      {(blocks.data?.blocked ?? []).map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
                        >
                          <Link href={`/users/${b.blocked.id}`} className="hover:underline">
                            @{b.blocked.username ?? b.blocked.name ?? '—'}
                          </Link>
                          <IconButton
                            aria-label="حذف بلاک"
                            size="sm"
                            variant="ghost"
                            icon={<Trash2 className="size-4" />}
                            onClick={() => removeBlock.mutate(b.id)}
                          />
                        </li>
                      ))}
                      {(blocks.data?.blocked ?? []).length === 0 ? (
                        <li className="text-sm text-muted-foreground py-2">خالی</li>
                      ) : null}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-2">
                      بلاک شده توسط ({formatPersianNumber(blocks.data?.blocking.length ?? 0)})
                    </h3>
                    <ul className="space-y-1">
                      {(blocks.data?.blocking ?? []).map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
                        >
                          <Link href={`/users/${b.blocker.id}`} className="hover:underline">
                            @{b.blocker.username ?? b.blocker.name ?? '—'}
                          </Link>
                          <IconButton
                            aria-label="حذف بلاک"
                            size="sm"
                            variant="ghost"
                            icon={<Trash2 className="size-4" />}
                            onClick={() => removeBlock.mutate(b.id)}
                          />
                        </li>
                      ))}
                      {(blocks.data?.blocking ?? []).length === 0 ? (
                        <li className="text-sm text-muted-foreground py-2">خالی</li>
                      ) : null}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="followers">
              <Card>
                <CardContent className="!p-3 space-y-1">
                  {followers.data?.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      دنبال‌کننده‌ای ندارد.
                    </div>
                  ) : (
                    followers.data?.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50"
                      >
                        <Link href={`/users/${f.follower.id}`} className="text-sm hover:underline">
                          @{f.follower.username ?? f.follower.name ?? '—'}
                        </Link>
                        <IconButton
                          aria-label="حذف فالو"
                          size="sm"
                          variant="ghost"
                          icon={<UserMinus className="size-4" />}
                          onClick={() => removeFollow.mutate(f.id)}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="following">
              <Card>
                <CardContent className="!p-3 space-y-1">
                  {following.data?.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      کسی را دنبال نمی‌کند.
                    </div>
                  ) : (
                    following.data?.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50"
                      >
                        <Link href={`/users/${f.following.id}`} className="text-sm hover:underline">
                          @{f.following.username ?? f.following.name ?? '—'}
                        </Link>
                        <IconButton
                          aria-label="حذف فالو"
                          size="sm"
                          variant="ghost"
                          icon={<UserMinus className="size-4" />}
                          onClick={() => removeFollow.mutate(f.id)}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ConfirmDialog
        open={banConfirm}
        onOpenChange={setBanConfirm}
        title="مسدودسازی کاربر"
        description={`حساب «@${u.username ?? '—'}» مسدود می‌شود.`}
        confirmLabel="مسدود"
        tone="destructive"
        reasonLabel="دلیل"
        reasonRequired
        isLoading={ban.isPending}
        onConfirm={(reason) => reason && ban.mutate(reason)}
      />
      <ConfirmDialog
        open={unbanConfirm}
        onOpenChange={setUnbanConfirm}
        title="رفع مسدودی"
        description={`کاربر می‌تواند دوباره وارد سایت شود.`}
        confirmLabel="رفع مسدودی"
        isLoading={unban.isPending}
        onConfirm={() => unban.mutate()}
      />

      <Dialog open={!!editForm} onOpenChange={(o) => !o && setEditForm(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>ویرایش پروفایل</DialogTitle>
          </DialogHeader>
          {editForm ? (
            <div className="space-y-3">
              <div>
                <Label>نام</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>نام کاربری</Label>
                <Input
                  dir="ltr"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                />
              </div>
              <div>
                <Label>بیو</Label>
                <Textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditForm(null)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={saveEdit.isPending}
              onClick={() => editForm && saveEdit.mutate(editForm)}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleForm} onOpenChange={(o) => !o && setRoleForm(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>تغییر نقش</DialogTitle>
          </DialogHeader>
          {roleForm ? (
            <div className="space-y-3">
              <Label>نقش جدید</Label>
              <select
                className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={roleForm.role}
                onChange={(e) =>
                  setRoleForm({ role: e.target.value as 'user' | 'admin' | 'moderator' })
                }
              >
                <option value="user">کاربر عادی</option>
                <option value="moderator">ناظر</option>
                <option value="admin">ادمین کل</option>
              </select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoleForm(null)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={setRole.isPending}
              onClick={() => roleForm && setRole.mutate(roleForm.role)}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!walletForm} onOpenChange={(o) => !o && setWalletForm(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {walletForm?.type === 'credit' ? 'شارژ کیف پول' : 'کسر از کیف پول'}
            </DialogTitle>
          </DialogHeader>
          {walletForm ? (
            <div className="space-y-3">
              <div>
                <Label required>مبلغ (تومان)</Label>
                <Input
                  type="number"
                  min={1}
                  value={walletForm.amount}
                  onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label required>دلیل</Label>
                <Textarea
                  rows={3}
                  value={walletForm.reason}
                  onChange={(e) => setWalletForm({ ...walletForm, reason: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWalletForm(null)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={wallet.isPending}
              disabled={!walletForm?.amount || !walletForm?.reason}
              onClick={() =>
                walletForm &&
                wallet.mutate({
                  type: walletForm.type,
                  amount: Number(walletForm.amount),
                  reason: walletForm.reason,
                })
              }
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!karmaForm} onOpenChange={(o) => !o && setKarmaForm(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>تنظیم کارما</DialogTitle>
          </DialogHeader>
          {karmaForm ? (
            <div className="space-y-3">
              <div>
                <Label required>مقدار کارما</Label>
                <Input
                  type="number"
                  value={karmaForm.karma}
                  onChange={(e) => setKarmaForm({ ...karmaForm, karma: e.target.value })}
                />
              </div>
              <div>
                <Label required>دلیل</Label>
                <Textarea
                  rows={3}
                  value={karmaForm.reason}
                  onChange={(e) => setKarmaForm({ ...karmaForm, reason: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setKarmaForm(null)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={adjustKarma.isPending}
              disabled={!karmaForm?.karma || !karmaForm?.reason}
              onClick={() =>
                karmaForm &&
                adjustKarma.mutate({
                  karma: Number(karmaForm.karma),
                  reason: karmaForm.reason,
                })
              }
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-lg font-extrabold tabular-nums">{formatPersianNumber(value)}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
