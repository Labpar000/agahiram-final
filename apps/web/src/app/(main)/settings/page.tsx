'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Languages, LogOut, Palette, Shield, Sparkles, User, Wallet } from 'lucide-react';
import { formatPersianPrice } from '@agahiram/shared';
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
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () =>
      (await apiClient.get<{ balance: number; currency: string }>('/payments/wallet')).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiClient.patch('/users/me', { name, bio });
      if (!r.success) throw new Error(r.error);
    },
    onSuccess: () => toast.success('پروفایل ذخیره شد'),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="bg-background pb-12">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-h2 font-bold tracking-tight">تنظیمات</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        <Card>
          <CardContent className="!p-5">
            <div className="flex items-center gap-4">
              <Avatar size="lg" ring="brand" verified={user?.isVerified ?? false}>
                {user?.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                <AvatarFallback>{(user?.username ?? '?').slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {user?.name ?? user?.username ?? 'مهمان'}
                </p>
                <p className="truncate text-xs text-muted-foreground">@{user?.username ?? '—'}</p>
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
            <Button variant="brand" onClick={() => save.mutate()} isLoading={save.isPending}>
              ذخیره تغییرات
            </Button>
          </div>
        </Section>

        <Section title="کیف پول" icon={<Wallet className="size-5" aria-hidden />}>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs text-muted-foreground">موجودی</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight gradient-text-brand">
              {formatPersianPrice(wallet?.balance ?? 0)}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" size="sm">
                شارژ حساب
              </Button>
              <Button variant="outline" size="sm">
                تاریخچه
              </Button>
            </div>
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
              checked={notifLikes}
              onCheckedChange={setNotifLikes}
              aria-label="اعلان پسندها"
            />
          </Row>
          <Row label="نظرات">
            <Switch
              checked={notifComments}
              onCheckedChange={setNotifComments}
              aria-label="اعلان نظرات"
            />
          </Row>
          <Row label="دنبال‌کردن جدید">
            <Switch
              checked={notifFollows}
              onCheckedChange={setNotifFollows}
              aria-label="اعلان دنبال‌کردن"
            />
          </Row>
        </Section>

        <Section title="حریم خصوصی" icon={<Shield className="size-5" aria-hidden />}>
          <Row label="حساب خصوصی" description="فقط دنبال‌کنندگان می‌توانند پست‌ها را ببینند">
            <Switch
              checked={privateAccount}
              onCheckedChange={setPrivateAccount}
              aria-label="حساب خصوصی"
            />
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

        <Button
          variant="outline"
          fullWidth
          size="lg"
          leftIcon={<LogOut className="size-5" aria-hidden />}
          onClick={() => void logout()}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          خروج از حساب
        </Button>
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
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            {icon ? <span aria-hidden>{icon}</span> : null}
            {label}
          </div>
          {description ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
      <Separator className="last:hidden" />
    </>
  );
}
