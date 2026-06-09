'use client';

import { useRouter } from 'next/navigation';
import { IgArrowBack, IconButton } from '@agahiram/ui';

export default function PrivacySettingsPage() {
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
        <h1 className="text-lg font-bold">حریم خصوصی</h1>
      </div>
      <div className="mx-auto max-w-2xl p-4 text-sm text-muted-foreground">به‌زودی</div>
    </div>
  );
}
