'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Database, Folder, MapPin, Save, Sparkles, Tag } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Separator,
  Switch,
  Textarea,
  ThemeToggle,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { apiClient } from '@/lib/api';
import { FormField } from '@/components/form-field';

interface PlatformSettings {
  siteName?: string;
  contactEmail?: string | null;
  supportPhone?: string | null;
  postsRequireApproval?: boolean;
  allowRegistration?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  maxPostsPerDay?: number;
  defaultPostExpiryDays?: number;
  privacyContent?: string | null;
  termsContent?: string | null;
  adsEnabled?: boolean;
  adsExploreInterval?: number;
  adsStoryInterval?: number;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await apiClient.get<PlatformSettings>('/admin/settings')).data ?? {},
  });

  const [form, setForm] = useState<PlatformSettings>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        contactEmail: form.contactEmail?.trim() || null,
        supportPhone: form.supportPhone?.trim() || null,
        maintenanceMessage: form.maintenanceMessage?.trim() || null,
        privacyContent: form.privacyContent?.trim() || null,
        termsContent: form.termsContent?.trim() || null,
      };
      const r = await apiClient.post('/admin/settings', payload);
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r;
    },
    onSuccess: () => {
      toast.success('تنظیمات ذخیره شد');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Shell adminOnly>
      <div className="mb-6">
        <h1 className="text-h2 font-extrabold tracking-tight">تنظیمات پلتفرم</h1>
        <p className="mt-1 text-sm text-muted-foreground">پیکربندی عمومی، محتوا و دسترسی‌ها</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <SectionCard
          icon={<Sparkles className="size-5" aria-hidden />}
          title="عمومی"
          description="نام و اطلاعات تماس پلتفرم"
        >
          <FormField id="siteName" label="نام سایت" required>
            <Input
              id="siteName"
              value={form.siteName ?? ''}
              onChange={(e) => set('siteName', e.target.value)}
              disabled={isLoading}
            />
          </FormField>
          <FormField id="contactEmail" label="ایمیل پشتیبانی">
            <Input
              id="contactEmail"
              type="email"
              dir="ltr"
              value={form.contactEmail ?? ''}
              onChange={(e) => set('contactEmail', e.target.value)}
              disabled={isLoading}
              placeholder="support@example.com"
            />
          </FormField>
          <FormField id="supportPhone" label="شماره تماس">
            <Input
              id="supportPhone"
              dir="ltr"
              inputMode="tel"
              value={form.supportPhone ?? ''}
              onChange={(e) => set('supportPhone', e.target.value)}
              disabled={isLoading}
              placeholder="021-12345678"
            />
          </FormField>
        </SectionCard>

        <SectionCard
          icon={<Tag className="size-5" aria-hidden />}
          title="محتوا و کاربری"
          description="کنترل جریان آگهی‌ها و عضویت‌ها"
        >
          <ToggleRow
            label="نیاز به تأیید آگهی‌ها"
            description="آگهی‌های جدید پیش از انتشار توسط ادمین بررسی شوند."
            checked={!!form.postsRequireApproval}
            onChange={(v) => set('postsRequireApproval', v)}
          />
          <Separator />
          <ToggleRow
            label="ثبت‌نام کاربر جدید"
            description="اگر خاموش شود، کاربر جدید نمی‌تواند ثبت‌نام کند."
            checked={form.allowRegistration ?? true}
            onChange={(v) => set('allowRegistration', v)}
          />
        </SectionCard>

        <SectionCard
          icon={<Database className="size-5" aria-hidden />}
          title="حالت تعمیر"
          description="در صورت فعال‌سازی، اپ کاربران صفحه تعمیر را نمایش می‌دهد"
        >
          <ToggleRow
            label="فعال‌سازی حالت تعمیر"
            checked={!!form.maintenanceMode}
            onChange={(v) => set('maintenanceMode', v)}
          />
          <FormField
            id="maintenanceMessage"
            label="پیام نمایشی"
            description="در صفحه تعمیر به کاربران نشان داده می‌شود."
          >
            <Textarea
              id="maintenanceMessage"
              autoGrow
              rows={3}
              maxLength={300}
              value={form.maintenanceMessage ?? ''}
              onChange={(e) => set('maintenanceMessage', e.target.value)}
              disabled={isLoading || !form.maintenanceMode}
              placeholder="در حال به‌روزرسانی هستیم. به‌زودی برمی‌گردیم."
            />
          </FormField>
        </SectionCard>

        <SectionCard
          icon={<Tag className="size-5" aria-hidden />}
          title="تبلیغات"
          description="فعال‌سازی و فاصله نمایش تبلیغات در اپ"
        >
          <ToggleRow
            label="نمایش تبلیغات در اپ"
            description="اگر خاموش باشد، تبلیغات در اکسپلور و استوری نمایش داده نمی‌شوند."
            checked={!!form.adsEnabled}
            onChange={(v) => set('adsEnabled', v)}
          />
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <FormField id="adsExploreInterval" label="فاصله تبلیغ در اکسپلور (هر N tile)">
              <Input
                id="adsExploreInterval"
                type="number"
                min={3}
                max={30}
                value={form.adsExploreInterval ?? 9}
                onChange={(e) => set('adsExploreInterval', Number(e.target.value))}
                disabled={isLoading}
              />
            </FormField>
            <FormField id="adsStoryInterval" label="فاصله تبلیغ در استوری (هر N استوری)">
              <Input
                id="adsStoryInterval"
                type="number"
                min={3}
                max={20}
                value={form.adsStoryInterval ?? 5}
                onChange={(e) => set('adsStoryInterval', Number(e.target.value))}
                disabled={isLoading}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Tag className="size-5" aria-hidden />}
          title="محدودیت‌های آگهی"
          description="حداکثر آگهی روزانه برای هر کاربر و انقضای پیش‌فرض"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField id="maxPostsPerDay" label="حداکثر آگهی روزانه">
              <Input
                id="maxPostsPerDay"
                type="number"
                min={1}
                value={form.maxPostsPerDay ?? 10}
                onChange={(e) => set('maxPostsPerDay', Number(e.target.value))}
                disabled={isLoading}
              />
            </FormField>
            <FormField id="defaultPostExpiryDays" label="انقضای آگهی (روز)">
              <Input
                id="defaultPostExpiryDays"
                type="number"
                min={1}
                value={form.defaultPostExpiryDays ?? 30}
                onChange={(e) => set('defaultPostExpiryDays', Number(e.target.value))}
                disabled={isLoading}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Folder className="size-5" aria-hidden />}
          title="منابع داده"
          description="مدیریت دسته‌بندی‌ها، مناطق و پلن‌های نردبان"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ResourceLink
              href="/categories"
              icon={<Folder className="size-4" />}
              label="دسته‌بندی‌ها"
            />
            <ResourceLink href="/locations" icon={<MapPin className="size-4" />} label="مناطق" />
            <ResourceLink
              href="/boost-plans"
              icon={<Sparkles className="size-4" />}
              label="پلن‌های نردبان"
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={<Tag className="size-5" aria-hidden />}
          title="صفحات قانونی"
          description="محتوای حریم خصوصی و شرایط استفاده (CMS)"
        >
          <FormField id="privacyContent" label="حریم خصوصی">
            <Textarea
              id="privacyContent"
              rows={8}
              value={form.privacyContent ?? ''}
              onChange={(e) => set('privacyContent', e.target.value || null)}
              placeholder="متن صفحه حریم خصوصی…"
            />
          </FormField>
          <FormField id="termsContent" label="شرایط استفاده">
            <Textarea
              id="termsContent"
              rows={8}
              value={form.termsContent ?? ''}
              onChange={(e) => set('termsContent', e.target.value || null)}
              placeholder="متن صفحه شرایط استفاده…"
            />
          </FormField>
        </SectionCard>

        <SectionCard
          icon={<Sparkles className="size-5" aria-hidden />}
          title="ظاهر"
          description="تم پنل ادمین"
        >
          <ToggleRow
            label="حالت ظاهری"
            description="انتخاب بین روشن، تیره یا تطبیق با سیستم."
            right={<ThemeToggle />}
          />
        </SectionCard>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button
            variant="brand"
            size="lg"
            leftIcon={<Save className="size-5" aria-hidden />}
            onClick={() => save.mutate()}
            isLoading={save.isPending}
            disabled={isLoading}
            className="shadow-popover"
          >
            ذخیره تغییرات
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="!p-6 space-y-5">
        <header className="space-y-1">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <span
              className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground"
              aria-hidden
            >
              {icon}
            </span>
            {title}
          </div>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </header>
        <div className="space-y-5">{children}</div>
      </CardContent>
    </Card>
  );
}

function ResourceLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <span className="inline-flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
          {icon}
        </span>
        {label}
      </span>
      <ChevronLeft className="size-4 text-muted-foreground rtl:rotate-180 group-hover:text-foreground" />
    </Link>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  right,
}: {
  label: string;
  description?: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">
        {right ?? (
          <Switch checked={!!checked} onCheckedChange={(v) => onChange?.(v)} aria-label={label} />
        )}
      </div>
    </div>
  );
}
