'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IgArrowBack,
  IgBell,
  IgHelp,
  IgInfo,
  IgLock,
  IgMoon,
  IgShield,
  IgShop,
  IgUser,
  IgWallet,
  IconButton,
  Separator,
  ThemeToggle,
} from '@agahiram/ui';

const SETTINGS_SECTIONS = [
  {
    label: 'روش استفاده از آگهی‌رام',
    items: [
      {
        icon: IgUser,
        label: 'ویرایش پروفایل',
        href: '/settings/profile',
        desc: 'نام، بیو، آواتار و وب‌سایت',
      },
      {
        icon: IgShop,
        label: 'فروشگاه',
        href: '/settings/shop',
        desc: 'مدیریت فروشگاه و تأییدیه‌ها',
      },
      {
        icon: IgBell,
        label: 'اعلان‌ها',
        href: '/settings/notifications',
        desc: 'تنظیمات اعلان‌ها',
      },
      {
        icon: IgLock,
        label: 'حریم خصوصی',
        href: '/settings/privacy',
        desc: 'حساب‌های بلاک‌شده و muted',
      },
    ],
  },
  {
    label: 'سایر',
    items: [
      ...(process.env.NEXT_PUBLIC_WALLET_ENABLED === 'true'
        ? [
            {
              icon: IgWallet,
              label: 'کیف پول و پرداخت',
              href: '/settings/payment',
              desc: 'موجودی و تراکنش‌ها',
            },
          ]
        : []),
      { icon: IgShield, label: 'امنیت', href: '/settings/security', desc: 'تغییر رمز عبور' },
      { icon: IgMoon, label: 'حالت تاریک', href: '#theme', desc: 'تغییر تم روشن/تاریک' },
      { icon: IgInfo, label: 'درباره', href: '/settings/about', desc: 'نسخه، قوانین و حریم خصوصی' },
      {
        icon: IgHelp,
        label: 'راهنما و پشتیبانی',
        href: '/settings/help',
        desc: 'تماس با ما و راهنمایی',
      },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="bg-background min-h-svh pb-8">
      <div className="glass sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border-subtle px-3 py-4">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold tracking-tight">تنظیمات</h1>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        {SETTINGS_SECTIONS.map((section, si) => (
          <div key={si}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              {section.items.map((item, ii) =>
                item.href === '#theme' ? (
                  <div
                    key={ii}
                    className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className="size-5 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                    <ThemeToggle />
                  </div>
                ) : (
                  <Link
                    key={ii}
                    href={item.href}
                    className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className="size-5 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                    <svg
                      className="size-4 shrink-0 text-muted-foreground/50 rtl:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}

        <Separator className="my-4" />

        <Link
          href="/settings/logout"
          className="flex w-full items-center justify-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
        >
          خروج از حساب
        </Link>
      </div>
    </div>
  );
}
