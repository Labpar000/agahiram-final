'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IgArrowBack, IconButton } from '@agahiram/ui';

export default function AboutSettingsPage() {
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
        <h1 className="text-lg font-bold">درباره</h1>
      </div>
      <div className="mx-auto max-w-2xl p-4 space-y-4 text-sm">
        <p className="font-medium">آگهی‌رام — ترکیب اینستاگرام و دیوار</p>
        <div className="space-y-2 text-muted-foreground">
          <div className="flex justify-between">
            <span>نسخه</span>
            <span>1.0.0</span>
          </div>
        </div>
        <div className="pt-3 flex gap-3">
          <Link href="/privacy" className="text-primary hover:underline text-xs">
            حریم خصوصی
          </Link>
          <Link href="/terms" className="text-primary hover:underline text-xs">
            قوانین و مقررات
          </Link>
        </div>
      </div>
    </div>
  );
}
