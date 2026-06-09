'use client';

import Link from 'next/link';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';

export default function AboutSettingsPage() {
  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="درباره" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <SettingsSection>
          <div className="space-y-4 px-4 py-4 text-sm">
            <p className="font-medium">آگهی‌رام — ترکیب اینستاگرام و دیوار</p>
            <div className="flex justify-between text-muted-foreground">
              <span>نسخه</span>
              <span dir="ltr">{APP_VERSION}</span>
            </div>
            <div className="flex gap-3 pt-1">
              <Link href="/privacy" className="text-xs text-primary hover:underline">
                حریم خصوصی
              </Link>
              <Link href="/terms" className="text-xs text-primary hover:underline">
                قوانین و مقررات
              </Link>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
