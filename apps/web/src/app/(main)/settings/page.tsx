'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ImagePlus,
  HelpCircle,
  Languages,
  LockKeyhole,
  LogOut,
  Palette,
  Shield,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';
import { formatPersianPrice, PaymentPurpose, usernameSchema } from '@agahiram/shared';
import { S3_FOLDERS } from '@agahiram/shared/constants';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Separator,
  Switch,
  Textarea,
  ThemeToggle,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { uploadToMinio } from '@/lib/upload-media';
import { useAuth } from '@/hooks/useAuth';
import { patchAuthUser, patchProfileQuery } from '@/lib/query-cache-profile';
import { useAuthStore } from '@/lib/auth-store';

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
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const { user, logout, refetch } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [debouncedUsername, setDebouncedUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [showHistory, setShowHistory] = useState(false);
  const [topupAmount, setTopupAmount] = useState('100000');
  const [avatarUploading, setAvatarUploading] = useState(false);

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

  useEffect(() => {
    setName(user?.name ?? '');
    setUsername(user?.username ?? '');
    setDebouncedUsername(user?.username ?? '');
    setBio(user?.bio ?? '');
    setIsPrivate(user?.isPrivate ?? false);
  }, [user?.bio, user?.isPrivate, user?.name, user?.username]);

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
      });
      if (!r.success) throw new Error(r.error);
    },
    onSuccess: () => {
      toast.success('پروفایل ذخیره شد');
      updateUser({ name, username, bio, isPrivate });
      patchAuthUser(qc, { name, username, bio, isPrivate });
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
    onSuccess: () => void refetchPrefs(),
    onError: (e) => toast.error((e as Error).message),
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
      <div className="sticky top-[var(--header-height)] z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md">
        <h1 className="text-h2 font-bold tracking-tight">تنظیمات</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        <Card>
          <CardContent className="!p-5">
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer">
                <Avatar size="lg" ring="brand" verified={user?.isVerified ?? false}>
                  {user?.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                  <AvatarFallback>{(user?.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -end-1 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <ImagePlus className="size-4" aria-hidden />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
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
                  <p className="mt-1 text-[11px] text-primary">در حال آپلود آواتار…</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Section title="حساب کاربری" icon={<User className="size-5" aria-hidden />}>
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

        <Section title="ظاهر" icon={<Palette className="size-5" aria-hidden />}>
          <Row label="حالت ظاهری" description="روشن، تیره یا تطبیق با سیستم">
            <ThemeToggle />
          </Row>
        </Section>

        <Section title="اعلان‌ها" icon={<Bell className="size-5" aria-hidden />}>
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

        <Section title="حریم خصوصی" icon={<Shield className="size-5" aria-hidden />}>
          <Row label="حساب خصوصی" description="فقط دنبال‌کنندگان می‌توانند پست‌ها را ببینند">
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} aria-label="حساب خصوصی" />
          </Row>
          <div className="rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            بعد از تغییر وضعیت حریم خصوصی، دکمه «ذخیره تغییرات» در بخش حساب کاربری را بزنید.
          </div>
        </Section>

        <Section title="کاربران مسدودشده" icon={<LockKeyhole className="size-5" aria-hidden />}>
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
                    const r = await apiClient.delete(`/users/me/blocked/${u.username}`);
                    if (r.success) {
                      toast.success('کاربر از مسدودها حذف شد');
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

        <Section title="امنیت و راهنما" icon={<HelpCircle className="size-5" aria-hidden />}>
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

        <Section title="درباره" icon={<Sparkles className="size-5" aria-hidden />}>
          <Row label="زبان" icon={<Languages className="size-4" aria-hidden />}>
            <span className="text-sm text-muted-foreground">فارسی</span>
          </Row>
          <Row label="نسخه">
            <span className="text-sm text-muted-foreground tabular-nums">۰٫۱٫۰</span>
          </Row>
        </Section>

        <Section title="کیف پول" icon={<Wallet className="size-5" aria-hidden />}>
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
                        <span className="text-muted-foreground">{item.status}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </Section>

        <button
          type="button"
          className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            if (window.confirm('آیا مطمئن هستید که می‌خواهید از حساب خارج شوید؟')) void logout();
          }}
        >
          <LogOut className="size-5" aria-hidden />
          خروج از حساب
        </button>
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
