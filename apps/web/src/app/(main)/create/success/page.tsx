'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, IgCheck, IgPlus, Spinner } from '@agahiram/ui';
import { useAuthStore } from '@/lib/auth-store';

export default function CreateSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[calc(100dvh-var(--header-height)-var(--bottom-nav))] place-items-center">
          <Spinner size="lg" label="در حال بارگذاری…" />
        </div>
      }
    >
      <CreateSuccessInner />
    </Suspense>
  );
}

function CreateSuccessInner() {
  const searchParams = useSearchParams();
  const postId = searchParams.get('id');
  const username = useAuthStore((s) => s.user?.username);

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height)-var(--bottom-nav))] flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-success/15 text-success">
        <IgCheck className="size-9" strokeWidth={2} aria-hidden />
      </span>
      <h1 className="mt-6 text-xl font-bold">آگهی شما با موفقیت ثبت شد</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        آگهی شما در انتظار تأیید مدیریت است. پس از تأیید در سایت نمایش داده خواهد شد.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button asChild className="btn-ig-link" fullWidth size="lg">
          <Link href={username ? `/profile/${username}` : '/profile'}>مشاهده آگهی‌های من</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          fullWidth
          size="lg"
          leftIcon={<IgPlus className="size-5" strokeWidth={1.75} aria-hidden />}
        >
          <Link href="/create">ثبت آگهی جدید</Link>
        </Button>
        {postId ? (
          <Button asChild variant="outline" fullWidth size="sm">
            <Link href={`/post/${postId}`}>پیش‌نمایش آگهی</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
