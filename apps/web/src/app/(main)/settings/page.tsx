'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IgArrowBack,
  IgBell,
  IgGallery,
  IgHelp,
  IgLock,
  IgLogout,
  IgMoon,
  IgShield,
  IgUser,
  IgWallet,
  IconButton,
  Input,
  Label,
  Separator,
  Switch,
  Textarea,
  ThemeToggle,
  toast,
} from '@agahiram/ui';
import { formatPersianPrice, PaymentPurpose, usernameSchema } from '@agahiram/shared';
import { S3_FOLDERS } from '@agahiram/shared/constants';
import { apiClient } from '@/lib/api';
import { uploadToMinio } from '@/lib/upload-media';
import { useAuth } from '@/hooks/useAuth';
import { patchAuthUser, patchProfileQuery } from '@/lib/query-cache-profile';
import { useAuthStore } from '@/lib/auth-store';

const PAYMENT_STATUS_FA: Record<string, string> = {
  PENDING: 'در انتظار',
  COMPLETED: 'موفق',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو شده',
  PROCESSING: 'در حال پردازش',
  REFUNDED: 'بازگشت وجه',
};

function localizeStatus(status: string) {
  return PAYMENT_STATUS_FA[status.toUpperCase()] ?? status;
}

interface NotificationPrefs {
  likesPush: boolean;
  commentsPush: boolean;
  followsPush: boolean;
  messagesPush: boolean;
  likesEmail: boolean;
  commentsEmail: boolean;
  followsEmail: boolean;
  messagesEmail: boolean;
}

interface BlockedUser {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const { user, logout, refetch } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [debouncedUsername, setDebouncedUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [storyArchiveEnabled, setStoryArchiveEnabled] = useState(user?.storyArchiveEnabled ?? true);
  const [showHistory, setShowHistory] = useState(false);
  const [topupAmount, setTopupAmount] = useState('100000');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutIban, setPayoutIban] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () =>
      (await apiClient.get<{ balance: string | number; currency: string }>('/payments/wallet'))
        .data,
  });

  const { data: prefs, refetch: refetchPrefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () =>
      (await apiClient.get<NotificationPrefs>('/users/me/notification-preferences')).data,
  });

  const { data: blocked = [], refetch: refetchBlocked } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => (await apiClient.get<BlockedUser[]>('/users/me/blocked')).data ?? [],
  });

  const { data: collections = [], refetch: refetchCollections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () =>
      (
        await apiClient.get<Array<{ id: string; name: string; _count?: { saves: number } }>>(
          '/me/collections',
        )
      ).data ?? [],
  });

  const { data: payouts = [], refetch: refetchPayouts } = useQuery({
    queryKey: ['payouts'],
    queryFn: async () =>
      (
        await apiClient.get<
          Array<{
            id: string;
            amount: string;
            status: string;
            iban: string;
            createdAt: string;
          }>
        >('/payments/payouts')
      ).data ?? [],
  });

  useEffect(() => {
    setName(user?.name ?? '');
    setUsername(user?.username ?? '');
    setDebouncedUsername(user?.username ?? '');
    setBio(user?.bio ?? '');
    setIsPrivate(user?.isPrivate ?? false);
    setStoryArchiveEnabled(user?.storyArchiveEnabled ?? true);
  }, [user?.bio, user?.isPrivate, user?.name, user?.username, user?.storyArchiveEnabled]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedUsername(username.trim().toLowerCase()), 350);
    return () => window.clearTimeout(t);
  }, [username]);

  const usernameParse = useMemo(() => usernameSchema.safeParse(username), [username]);
  const usernameChanged = debouncedUsername !== (user?.username ?? '');

  const { data: usernameAvailability, isFetching: checkingUsername } = useQuery({
    queryKey: ['username-availability', debouncedUsername],
    queryFn: async () => {
      const r = await apiClient.get<{ username: string; available: boolean }>(
        '/users/username/availability',
        { username: debouncedUsername },
      );
      return r.data;
    },
    enabled: usernameChanged && usernameParse.success,
    staleTime: 30_000,
  });

  const savePrivacy = useMutation({
    mutationFn: async (patch: { isPrivate?: boolean; storyArchiveEnabled?: boolean }) => {
      const r = await apiClient.patch('/users/me', patch);
      if (!r.success) throw new Error(r.error);
    },
    onSuccess: (_data, patch) => {
      if ('isPrivate' in patch) updateUser({ isPrivate: patch.isPrivate });
      if ('storyArchiveEnabled' in patch)
        updateUser({ storyArchiveEnabled: patch.storyArchiveEnabled });
      toast.success('تنظیمات حریم خصوصی ذخیره شد');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsedUsername = usernameSchema.safeParse(username);
      if (!parsedUsername.success) throw new Error(parsedUsername.error.issues[0]?.message);
      if (usernameChanged && usernameAvailability && !usernameAvailability.available) {
        throw new Error('این نام کاربری قبلاً ثبت شده است');
      }
      const r = await apiClient.patch('/users/me', {
        name,
        username: parsedUsername.data,
        bio,
        isPrivate,
        storyArchiveEnabled,
      });
      if (!r.success) throw new Error(r.error);
    },
    onSuccess: () => {
      toast.success('پروفایل ذخیره شد');
      updateUser({ name, username, bio, isPrivate, storyArchiveEnabled });
      patchAuthUser(qc, { name, username, bio, isPrivate, storyArchiveEnabled });
      if (username) patchProfileQuery(qc, username, { name, bio });
      void refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updatePrefs = useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const r = await apiClient.patch('/users/me/notification-preferences', patch);
      if (!r.success) throw new Error(r.error);
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['notification-preferences'] });
      const prev = qc.getQueryData<NotificationPrefs>(['notification-preferences']);
      qc.setQueryData<NotificationPrefs>(['notification-preferences'], (old) =>
        old ? { ...old, ...patch } : old,
      );
      return { prev };
    },
    onError: (e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notification-preferences'], ctx.prev);
      toast.error((e as Error).message);
    },
    onSettled: () => void refetchPrefs(),
  });

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('فقط تصویر برای آواتار مجاز است');
      return;
    }
    setAvatarUploading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
        folder: S3_FOLDERS.AVATARS,
        contentType: file.type,
        extension,
      });
      if (!presign.success || !presign.data) throw new Error(presign.error ?? 'خطا در آپلود');
      const ok = await uploadToMinio(presign.data.uploadUrl, file, file.type);
      if (!ok) throw new Error('آپلود فایل ناموفق بود');
      const confirm = await apiClient.post('/media/confirm', { key: presign.data.key });
      if (!confirm.success) throw new Error(confirm.error ?? 'خطا در ثبت آپلود');
      const saved = await apiClient.patch('/users/me', { avatarKey: presign.data.key });
      if (!saved.success) throw new Error(saved.error ?? 'خطا در ذخیره آواتار');
      const avatarUrl = (saved.data as { avatar?: string } | undefined)?.avatar ?? user?.avatar;
      if (avatarUrl) {
        updateUser({ avatar: avatarUrl });
        patchAuthUser(qc, { avatar: avatarUrl });
        if (user?.username) patchProfileQuery(qc, user.username, { avatar: avatarUrl });
      }
      toast.success('آواتار به‌روزرسانی شد');
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const requestPayout = useMutation({
    mutationFn: async () => {
      const amount = Number(payoutAmount.replace(/\D/g, ''));
      const iban = payoutIban.trim().toUpperCase();
      if (!amount || amount < 50_000) throw new Error('حداقل مبلغ برداشت ۵۰٬۰۰۰ تومان است');
      if (!/^IR\d{24}$/.test(iban)) throw new Error('شماره شبا نامعتبر است (IR + ۲۴ رقم)');
      const r = await apiClient.post('/payments/payouts', { amount, iban });
      if (!r.success) throw new Error(r.error ?? 'خطا در ثبت درخواست برداشت');
    },
    onSuccess: () => {
      toast.success('درخواست برداشت ثبت شد');
      setPayoutAmount('');
      setPayoutIban('');
      void refetchPayouts();
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  type CollectionItem = { id: string; name: string; _count?: { saves: number } };

  const createCollection = useMutation({
    mutationFn: async (colName: string) => {
      const r = await apiClient.post<CollectionItem>('/me/collections', { name: colName });
      if (!r.success) throw new Error(r.error ?? 'خطا در ساخت مجموعه');
      return r.data;
    },
    onMutate: async (colName) => {
      await qc.cancelQueries({ queryKey: ['collections'] });
      const prev = qc.getQueryData<CollectionItem[]>(['collections']);
      const tempId = `temp-${Date.now()}`;
      qc.setQueryData<CollectionItem[]>(['collections'], (old) => [
        ...(old ?? []),
        { id: tempId, name: colName, _count: { saves: 0 } },
      ]);
      return { prev, tempId };
    },
    onSuccess: (created, _colName, ctx) => {
      toast.success('مجموعه ساخته شد');
      setNewCollectionName('');
      if (created && ctx?.tempId) {
        qc.setQueryData<CollectionItem[]>(['collections'], (old) =>
          (old ?? []).map((c) => (c.id === ctx.tempId ? { ...c, ...created } : c)),
        );
      }
    },
    onError: (e, _colName, ctx) => {
      if (ctx?.prev) qc.setQueryData(['collections'], ctx.prev);
      toast.error((e as Error).message);
    },
    onSettled: () => void refetchCollections(),
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/me/collections/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا در حذف مجموعه');
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['collections'] });
      const prev = qc.getQueryData<CollectionItem[]>(['collections']);
      qc.setQueryData<CollectionItem[]>(['collections'], (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success('مجموعه حذف شد');
    },
    onError: (e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['collections'], ctx.prev);
      toast.error((e as Error).message);
    },
    onSettled: () => void refetchCollections(),
  });

  const topup = useMutation({
    mutationFn: async () => {
      const amount = Number(topupAmount.replace(/\D/g, ''));
      if (!amount || amount < 10000) throw new Error('حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است');
      const r = await apiClient.post<{ paymentUrl: string }>('/payments/initiate', {
        purpose: PaymentPurpose.WALLET_TOPUP,
        amount,
      });
      if (!r.success || !r.data?.paymentUrl) throw new Error(r.error ?? 'خطا در شروع پرداخت');
      window.location.href = r.data.paymentUrl;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () =>
      (
        await apiClient.get<
          Array<{
            id: string;
            amount: string | number | bigint;
            purpose: string;
            status: string;
            createdAt: string;
          }>
        >('/payments/history')
      ).data ?? [],
    enabled: showHistory,
  });

  return (
    <div className="bg-background pb-12">
      <div className="glass sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border-subtle px-3 py-4">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-h2 font-bold tracking-tight">تنظیمات</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        <Card>
          <CardContent className="!p-5">
            <div className="flex items-center gap-4">
              <label className="relative inline-flex cursor-pointer">
                <Avatar size="lg" ring="brand" verified={user?.isVerified ?? false}>
                  {user?.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                  <AvatarFallback>{(user?.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="pointer-events-none absolute -bottom-1 -end-1 grid size-7 place-items-center rounded-full bg-foreground text-background shadow-md">
                  <IgGallery className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 z-10 cursor-pointer opacity-0 [font-size:0]"
                  disabled={avatarUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAvatar(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">
                  {user?.name ?? user?.username ?? 'مهمان'}
                </p>
                <p className="truncate text-xs text-muted-foreground">@{user?.username ?? '—'}</p>
                {avatarUploading ? (
                  <p className="mt-1 text-[11px] text-ig-link">در حال آپلود آواتار…</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Section
          title="حساب کاربری"
          icon={<IgUser className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          <div className="space-y-2">
            <Label htmlFor="name">نام نمایشی</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">نام کاربری</Label>
            <Input
              id="username"
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              aria-invalid={!usernameParse.success}
            />
            <p
              className={
                !usernameParse.success || usernameAvailability?.available === false
                  ? 'text-xs text-destructive'
                  : usernameAvailability?.available
                    ? 'text-xs text-emerald-600'
                    : 'text-xs text-muted-foreground'
              }
            >
              {!usernameParse.success
                ? usernameParse.error.issues[0]?.message
                : checkingUsername
                  ? 'در حال بررسی نام کاربری…'
                  : usernameChanged && usernameAvailability?.available
                    ? 'این نام کاربری آزاد است.'
                    : usernameChanged && usernameAvailability?.available === false
                      ? 'این نام کاربری قبلاً ثبت شده است.'
                      : '۳ تا ۳۰ کاراکتر؛ فقط حروف انگلیسی، عدد، _ و .'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">بیو</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              autoGrow
              rows={3}
              placeholder="درباره خود بنویسید…"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="brand"
              onClick={() => save.mutate()}
              isLoading={save.isPending}
              disabled={
                !usernameParse.success ||
                checkingUsername ||
                (usernameChanged && usernameAvailability?.available === false)
              }
            >
              ذخیره تغییرات
            </Button>
          </div>
        </Section>

        <Section title="ظاهر" icon={<IgMoon className="size-5" strokeWidth={1.75} aria-hidden />}>
          <Row label="حالت ظاهری" description="روشن، تیره یا تطبیق با سیستم">
            <ThemeToggle />
          </Row>
        </Section>

        <Section
          title="اعلان‌ها"
          icon={<IgBell className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          <Row label="پسندها">
            <Switch
              checked={prefs?.likesPush ?? true}
              onCheckedChange={(v) => updatePrefs.mutate({ likesPush: v })}
              aria-label="اعلان پسندها"
            />
          </Row>
          <Row label="نظرات">
            <Switch
              checked={prefs?.commentsPush ?? true}
              onCheckedChange={(v) => updatePrefs.mutate({ commentsPush: v })}
              aria-label="اعلان نظرات"
            />
          </Row>
          <Row label="دنبال‌کردن جدید">
            <Switch
              checked={prefs?.followsPush ?? true}
              onCheckedChange={(v) => updatePrefs.mutate({ followsPush: v })}
              aria-label="اعلان دنبال‌کردن"
            />
          </Row>
          <Row label="پیام‌ها">
            <Switch
              checked={prefs?.messagesPush ?? true}
              onCheckedChange={(v) => updatePrefs.mutate({ messagesPush: v })}
              aria-label="اعلان پیام‌ها"
            />
          </Row>
        </Section>

        <Section
          title="حریم خصوصی"
          icon={<IgShield className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          <Row label="حساب خصوصی" description="فقط دنبال‌کنندگان می‌توانند پست‌ها را ببینند">
            <Switch
              checked={isPrivate}
              disabled={savePrivacy.isPending}
              onCheckedChange={(v) => {
                setIsPrivate(v);
                savePrivacy.mutate({ isPrivate: v });
              }}
              aria-label="حساب خصوصی"
            />
          </Row>
          <Row
            label="آرشیو خودکار استوری"
            description="پس از ۲۴ ساعت استوری‌ها در آرشیو شخصی ذخیره می‌شوند"
          >
            <Switch
              checked={storyArchiveEnabled}
              disabled={savePrivacy.isPending}
              onCheckedChange={(v) => {
                setStoryArchiveEnabled(v);
                savePrivacy.mutate({ storyArchiveEnabled: v });
              }}
              aria-label="آرشیو خودکار استوری"
            />
          </Row>
        </Section>

        <Section
          title="کاربران مسدودشده"
          icon={<IgLock className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز کاربری را مسدود نکرده‌اید.</p>
          ) : (
            blocked.map((u) => (
              <Row
                key={u.id}
                label={u.name ?? u.username ?? 'کاربر'}
                description={`@${u.username ?? '—'}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!u.username) return;
                    // Optimistically remove from list
                    qc.setQueryData<BlockedUser[]>(['blocked-users'], (old) =>
                      (old ?? []).filter((b) => b.id !== u.id),
                    );
                    const r = await apiClient.delete(`/users/me/blocked/${u.username}`);
                    if (r.success) {
                      toast.success('کاربر از مسدودها حذف شد');
                    } else {
                      // Rollback on failure
                      void refetchBlocked();
                    }
                  }}
                >
                  رفع مسدودی
                </Button>
              </Row>
            ))
          )}
        </Section>

        <Section
          title="امنیت و راهنما"
          icon={<IgHelp className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          <Row label="ورود امن" description="ورود فقط با کد یک‌بارمصرف پیامکی انجام می‌شود.">
            <span className="text-sm text-muted-foreground">فعال</span>
          </Row>
          <Row
            label="نیاز به کمک دارید؟"
            description="برای گزارش مشکل یا درخواست پشتیبانی پیام بدهید."
          >
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:support@agahiram.ir">پشتیبانی</a>
            </Button>
          </Row>
        </Section>

        <Section title="درباره" icon={<IgHelp className="size-5" strokeWidth={1.75} aria-hidden />}>
          <Row label="زبان" icon={<IgHelp className="size-4" strokeWidth={1.75} aria-hidden />}>
            <span className="text-sm text-muted-foreground">فارسی</span>
          </Row>
          <Row label="نسخه">
            <span className="text-sm text-muted-foreground tabular-nums">۰٫۱٫۰</span>
          </Row>
          <Row label="سیاست حریم خصوصی" description="نحوه استفاده و حفاظت از داده‌های شما">
            <Button variant="outline" size="sm" asChild>
              <Link href="/privacy">مشاهده</Link>
            </Button>
          </Row>
          <Row label="شرایط استفاده" description="قوانین و مسئولیت‌های استفاده از پلتفرم">
            <Button variant="outline" size="sm" asChild>
              <Link href="/terms">مشاهده</Link>
            </Button>
          </Row>
        </Section>

        <Section
          title="مجموعه‌های ذخیره"
          icon={<IgGallery className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز مجموعه‌ای ندارید.</p>
          ) : (
            collections.map((c) => (
              <Row
                key={c.id}
                label={c.name}
                description={
                  c._count?.saves != null ? `${c._count.saves} آگهی ذخیره‌شده` : undefined
                }
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteCollectionId(c.id)}
                  disabled={deleteCollection.isPending}
                >
                  حذف
                </Button>
              </Row>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <Input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="نام مجموعه جدید"
              maxLength={80}
              aria-label="نام مجموعه جدید"
              className="flex-1"
            />
            <Button
              variant="brand"
              size="sm"
              disabled={!newCollectionName.trim() || createCollection.isPending}
              isLoading={createCollection.isPending}
              onClick={() => createCollection.mutate(newCollectionName.trim())}
            >
              افزودن
            </Button>
          </div>
        </Section>

        <Section
          title="کیف پول"
          icon={<IgWallet className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted p-5">
            <p className="text-xs text-muted-foreground">موجودی</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight gradient-text-brand">
              {formatPersianPrice(wallet?.balance ?? 0)}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="مبلغ (تومان)"
                  aria-label="مبلغ شارژ"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => topup.mutate()}
                  isLoading={topup.isPending}
                >
                  شارژ حساب
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setShowHistory((v) => !v)}
              >
                {showHistory ? 'بستن تاریخچه' : 'تاریخچه'}
              </Button>
              {showHistory ? (
                <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
                  {historyLoading ? (
                    <p className="text-xs text-muted-foreground">در حال بارگذاری…</p>
                  ) : (history ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">تراکنشی ثبت نشده است.</p>
                  ) : (
                    (history ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                        <span className="font-medium">
                          {formatPersianPrice(Number(item.amount))}
                        </span>
                        <span className="text-muted-foreground">{localizeStatus(item.status)}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
              <div className="space-y-2 border-t border-border-subtle pt-4">
                <p className="text-xs font-semibold text-muted-foreground">درخواست برداشت</p>
                <Input
                  inputMode="numeric"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="مبلغ (حداقل ۵۰٬۰۰۰ تومان)"
                  aria-label="مبلغ برداشت"
                />
                <Input
                  dir="ltr"
                  value={payoutIban}
                  onChange={(e) => setPayoutIban(e.target.value)}
                  placeholder="IRxxxxxxxxxxxxxxxxxxxxxxxx"
                  aria-label="شماره شبا"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestPayout.mutate()}
                  isLoading={requestPayout.isPending}
                  disabled={!payoutAmount.trim() || !payoutIban.trim()}
                >
                  ثبت درخواست برداشت
                </Button>
                {payouts.length > 0 ? (
                  <div className="space-y-1.5 rounded-xl border border-border bg-surface p-3">
                    {payouts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                        <span className="font-medium">{formatPersianPrice(Number(p.amount))}</span>
                        <span className="text-muted-foreground">{localizeStatus(p.status)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Section>

        <button
          type="button"
          className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setLogoutDialogOpen(true)}
        >
          <IgLogout className="size-5" strokeWidth={1.75} aria-hidden />
          خروج از حساب
        </button>

        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>خروج از حساب</DialogTitle>
              <DialogDescription>آیا مطمئن هستید که می‌خواهید از حساب خارج شوید؟</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setLogoutDialogOpen(false);
                  void logout();
                }}
              >
                خروج
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {deleteCollectionId ? (
          <Dialog open onOpenChange={(v) => !v && setDeleteCollectionId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>حذف مجموعه</DialogTitle>
                <DialogDescription>
                  آیا مطمئنید که این مجموعه حذف شود؟ این عمل قابل بازگشت نیست.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteCollectionId(null)}>
                  انصراف
                </Button>
                <Button
                  variant="destructive"
                  isLoading={deleteCollection.isPending}
                  onClick={() => {
                    deleteCollection.mutate(deleteCollectionId);
                    setDeleteCollectionId(null);
                  }}
                >
                  حذف
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 inline-flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
        {icon} {title}
      </h2>
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-card">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  icon,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            {icon ? <span aria-hidden>{icon}</span> : null}
            {label}
          </div>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
      <Separator className="last:hidden" />
    </>
  );
}
