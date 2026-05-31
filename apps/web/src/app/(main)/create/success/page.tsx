'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@agahiram/ui';
import { useAuthStore } from '@/lib/auth-store';

export default function CreateSuccessPage() {
  const searchParams = useSearchParams();
  const postId = searchParams.get('id');
  const username = useAuthStore((s) => s.user?.username);

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height)-var(--bottom-nav))] flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <CheckCircle2 className="size-16 text-green-600" strokeWidth={1.5} aria-hidden />
      <h1 className="mt-6 text-xl font-bold">آگهی شما با موفقیت ثبت شد</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        آگهی شما در انتظار تأیید مدیریت است. پس از تأیید در سایت نمایش داده خواهد شد.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button asChild variant="brand" fullWidth size="lg">
          <Link href={username ? `/profile/${username}` : '/profile'}>مشاهده آگهی‌های من</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          fullWidth
          size="lg"
          leftIcon={<Plus className="size-5" aria-hidden />}
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
