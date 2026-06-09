'use client';

import { useState } from 'react';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';

const FAQ = [
  {
    q: 'چطور آگهی ثبت کنم؟',
    a: 'از تب «+» در پایین صفحه، عکس و جزئیات آگهی را وارد کنید و منتظر تأیید بمانید.',
  },
  {
    q: 'چطور با فروشنده تماس بگیرم؟',
    a: 'روی آگهی دکمه «پیام» یا «تماس» را بزنید. برای تماس، شماره فروشنده نمایش داده می‌شود.',
  },
  {
    q: 'حساب خصوصی چیست؟',
    a: 'با فعال کردن حساب خصوصی در تنظیمات، فقط فالوورهای تأییدشده پست‌های شما را می‌بینند.',
  },
  {
    q: 'چطور فروشگاه بسازم؟',
    a: 'از تنظیمات → فروشگاه، فروشگاه خود را ایجاد کنید و مراحل تأییدیه را تکمیل کنید.',
  },
  {
    q: 'رمز عبور دارید؟',
    a: 'خیر. ورود فقط با کد یکبار مصرف (OTP) به شماره موبایل انجام می‌شود.',
  },
];

export default function HelpSettingsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="راهنما و پشتیبانی" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <SettingsSection label="تماس با پشتیبانی">
          <div className="space-y-2 px-4 py-4 text-sm">
            <p className="text-muted-foreground">
              برای ارتباط با پشتیبانی از طریق ایمیل زیر اقدام کنید:
            </p>
            <a
              href="mailto:support@agahiram.ir"
              className="block font-medium text-primary hover:underline"
              dir="ltr"
            >
              support@agahiram.ir
            </a>
          </div>
        </SettingsSection>

        <SettingsSection label="سوالات متداول">
          {FAQ.map((item, i) => (
            <div key={item.q} className="border-b border-border last:border-0">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3.5 text-start text-sm font-medium hover:bg-muted/30"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {item.q}
                <span className="text-muted-foreground">{openIndex === i ? '−' : '+'}</span>
              </button>
              {openIndex === i ? (
                <p className="px-4 pb-3.5 text-sm text-muted-foreground">{item.a}</p>
              ) : null}
            </div>
          ))}
        </SettingsSection>
      </div>
    </div>
  );
}
