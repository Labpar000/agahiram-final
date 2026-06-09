'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';
import {
  IgBell,
  IgHelp,
  IgInfo,
  IgLock,
  IgMoon,
  IgShield,
  IgShop,
  IgUser,
  IgWallet,
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
        desc: 'حساب‌های مسدود و بی‌صدا',
      },
    ],
  },
  {
    label: 'سایر',
    items: [
      {
        icon: IgWallet,
        label: 'کیف پول و پرداخت',
        href: '/settings/payment',
        desc: 'موجودی و تراکنش‌ها',
      },
      {
        icon: IgShield,
        label: 'امنیت',
        href: '/settings/security',
        desc: 'مدیریت حساب و شماره موبایل',
      },
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
  const { logout } = useAuth();

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="تنظیمات" />

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        {SETTINGS_SECTIONS.map((section, si) => (
          <SettingsSection key={si} label={section.label}>
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
          </SettingsSection>
        ))}

        <Separator className="my-4" />

        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center justify-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
        >
          خروج از حساب
        </button>
      </div>
    </div>
  );
}
